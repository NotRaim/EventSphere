const router = require('express').Router();
const crypto = require('crypto');
const Event = require('../models/Event');
const Order = require('../models/Order');
const Ticket = require('../models/Ticket');
const notify = require('../utils/notify');
const { auth } = require('../middleware/auth');
const { ticketCode, signature } = require('../utils/ticket');

function normalizeTicketTypes(event) {
  const rows = Array.isArray(event.ticketTypes) ? event.ticketTypes : [];
  if (rows.length) return rows;
  return [{ name: 'General Admission', price: Number(event.price || 0), capacity: Number(event.capacity || 1), benefits: [], sold: Number(event.registeredCount || 0) }];
}

function pickTicketType(event, requestedId) {
  const rows = normalizeTicketTypes(event);
  if (!requestedId) return rows[0];
  return rows.find(t => String(t._id) === String(requestedId));
}

async function issueTickets(order) {
  if (order.status === 'paid') {
    const existing = await Ticket.find({ orderId: order._id });
    if (existing.length) return existing;
  }

  const event = await Event.findById(order.eventId);
  if (!event) throw new Error('Event no longer exists');

  const type = pickTicketType(event, order.ticketType?.id || order.ticketType?._id);
  const typeName = String(order.ticketType?.name || type?.name || 'General Admission');
  const typePrice = Number(order.ticketType?.price ?? type?.price ?? event.price ?? 0);
  const benefits = Array.isArray(order.ticketType?.benefits) ? order.ticketType.benefits : (type?.benefits || []);

  if (type?.capacity && Number(type.sold || 0) + order.quantity > Number(type.capacity)) {
    throw new Error(`Not enough ${typeName} tickets remain`);
  }

  const updated = await Event.findOneAndUpdate(
    {
      _id: event._id,
      $expr: {
        $lte: [
          { $add: ['$registeredCount', order.quantity] },
          '$capacity'
        ]
      }
    },
    {
      $inc: { registeredCount: order.quantity }
    },
    { new: true }
  );

  if (!updated) throw new Error('Not enough seats remain');

  if (type?._id && event.ticketTypes?.length) {
    await Event.updateOne(
      { _id: event._id, 'ticketTypes._id': type._id },
      { $inc: { 'ticketTypes.$.sold': order.quantity } }
    );
  }

  const tickets = [];
  for (let i = 0; i < order.quantity; i += 1) {
    const code = ticketCode();
    tickets.push(await Ticket.create({
      ticketCode: code,
      verificationSig: signature(code, order.userId, order.eventId),
      userId: order.userId,
      eventId: order.eventId,
      orderId: order._id,
      eventSnapshot: {
        title: event.title,
        category: event.category,
        date: event.date,
        time: event.time,
        venue: event.venue,
        city: event.city,
        image: event.image,
        price: typePrice
      },
      ticketType: {
        name: typeName,
        price: typePrice,
        benefits
      },
      quantity: 1,
      amountPaid: order.amount / order.quantity
    }));
  }

  order.status = 'paid';
  order.paidAt = new Date();
  await order.save();
  await notify(
    order.userId,
    'Tickets confirmed',
    `${order.quantity} ${typeName} ticket${order.quantity > 1 ? 's' : ''} for ${event.title} are ready.`
  );

  return tickets;
}

function makeDemoPaymentId() {
  return `demo_pay_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
}

router.post('/order', auth, async (req, res) => {
  try {
    const event = await Event.findById(req.body.eventId);
    const requestedQuantity = Number(req.body.quantity || 1);
    if (!Number.isInteger(requestedQuantity) || requestedQuantity < 1 || requestedQuantity > 10) return res.status(400).json({ message: 'Quantity must be a whole number between 1 and 10' });
    const quantity = requestedQuantity;

    if (!event || event.status !== 'published') {
      return res.status(404).json({ message: 'Event not available' });
    }

    const deadline = String(event.registrationDeadline || '').trim();
    const salesCutoff = deadline
      ? new Date(`${deadline.slice(0, 10)}T23:59:59`)
      : new Date(`${String(event.date).slice(0, 10)}T${event.time || '00:00'}:00`);

    if (Number.isNaN(salesCutoff.getTime()) || salesCutoff < new Date()) {
      return res.status(409).json({ message: 'Ticket buying deadline is over for this event' });
    }

    if (event.registeredCount + quantity > event.capacity) {
      return res.status(409).json({ message: 'Not enough seats available' });
    }

    const selected = pickTicketType(event, req.body.ticketTypeId);
    if (!selected) return res.status(400).json({ message: 'Selected ticket type is not available' });

    if (selected.capacity && Number(selected.sold || 0) + quantity > Number(selected.capacity)) {
      return res.status(409).json({ message: `Not enough ${selected.name} tickets remain` });
    }

    const price = Math.max(0, Number(selected.price || 0));
    const amount = price * quantity;

    const order = await Order.create({
      receipt: `es_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
      userId: req.user._id,
      eventId: event._id,
      ticketType: {
        id: selected._id,
        name: selected.name,
        price,
        benefits: selected.benefits || []
      },
      quantity,
      amount,
      currency: 'INR',
      provider: amount === 0 ? 'free' : 'eventsphere-demo',
      status: 'created'
    });

    if (amount === 0) {
      const tickets = await issueTickets(order);
      return res.json({
        mode: 'free',
        orderDbId: order._id.toString(),
        tickets: tickets.map(t => ({ id: t._id.toString(), ticketCode: t.ticketCode }))
      });
    }

    res.json({
      mode: 'demo',
      orderDbId: order._id.toString(),
      amount,
      currency: 'INR',
      ticketType: order.ticketType,
      event: { title: event.title }
    });
  } catch (error) {
    res.status(400).json({ message: error.message || 'Order could not be created' });
  }
});

router.post('/demo-pay', auth, async (req, res) => {
  try {
    const { orderDbId, paymentMethod } = req.body;
    const allowedMethods = ['upi', 'card', 'netbanking'];

    if (!orderDbId) return res.status(400).json({ message: 'Order ID is required' });
    if (!allowedMethods.includes(paymentMethod)) {
      return res.status(400).json({ message: 'Choose a valid demo payment method' });
    }

    const existingOrder = await Order.findOne({ _id: orderDbId, userId: req.user._id }).lean();
    if (!existingOrder) return res.status(404).json({ message: 'Order not found' });
    if (existingOrder.status === 'paid') {
      const existing = await Ticket.find({ orderId: existingOrder._id });
      return res.json({ ok:true, demo:true, alreadyPaid:true, paymentId:existingOrder.providerPaymentId, tickets:existing.map(t=>({id:t._id.toString(),ticketCode:t.ticketCode})) });
    }
    if (existingOrder.status === 'processing') return res.status(409).json({ message: 'This payment is already being processed' });
    if (existingOrder.amount <= 0) return res.status(400).json({ message: 'This order is free' });

    const order = await Order.findOneAndUpdate(
      { _id: orderDbId, userId: req.user._id, status: 'created' },
      { $set: { status: 'processing', providerPaymentId: makeDemoPaymentId(), demoPaymentMethod: paymentMethod } },
      { new: true }
    );
    if (!order) return res.status(409).json({ message: 'This order is already being processed' });
    let tickets;
    try {
      tickets = await issueTickets(order);
    } catch (error) {
      await Order.updateOne({ _id: order._id, status: 'processing' }, { $set: { status: 'created' } });
      throw error;
    }

    res.json({
      ok: true,
      demo: true,
      paymentId: order.providerPaymentId,
      tickets: tickets.map(t => ({ id: t._id.toString(), ticketCode: t.ticketCode }))
    });
  } catch (error) {
    res.status(400).json({ message: error.message || 'Demo payment failed' });
  }
});

module.exports = { router };
