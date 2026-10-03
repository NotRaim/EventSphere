const router = require('express').Router();
const crypto = require('crypto');
const Event = require('../models/Event');
const Order = require('../models/Order');
const Ticket = require('../models/Ticket');
const notify = require('../utils/notify');
const { auth } = require('../middleware/auth');
const { ticketCode, signature } = require('../utils/ticket');

async function issueTickets(order) {
  if (order.status === 'paid') {
    const existing = await Ticket.find({ orderId: order._id });
    if (existing.length) return existing;
  }

  const event = await Event.findById(order.eventId);
  if (!event) throw new Error('Event no longer exists');

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
    { $inc: { registeredCount: order.quantity } },
    { new: true }
  );

  if (!updated) throw new Error('Not enough seats remain');

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
        price: event.price
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
    `${order.quantity} ticket${order.quantity > 1 ? 's' : ''} for ${event.title} are ready.`
  );

  return tickets;
}

function makeDemoPaymentId() {
  return `demo_pay_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
}

router.post('/order', auth, async (req, res) => {
  try {
    const event = await Event.findById(req.body.eventId);
    const quantity = Math.max(1, Math.min(10, Number(req.body.quantity || 1)));

    if (!event || event.status !== 'published') {
      return res.status(404).json({ message: 'Event not available' });
    }

    if (event.registrationDeadline && String(event.registrationDeadline) < new Date().toISOString().slice(0, 10)) {
      return res.status(409).json({ message: 'Ticket sales for this event have closed.' });
    }

    if (event.registeredCount + quantity > event.capacity) {
      return res.status(409).json({ message: 'Not enough seats available' });
    }

    const amount = Number(event.price || 0) * quantity;

    const order = await Order.create({
      receipt: `es_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
      userId: req.user._id,
      eventId: event._id,
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

    const order = await Order.findOne({ _id: orderDbId, userId: req.user._id });
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (order.status === 'paid') {
      const existing = await Ticket.find({ orderId: order._id });
      return res.json({
        ok: true,
        demo: true,
        alreadyPaid: true,
        paymentId: order.providerPaymentId,
        tickets: existing.map(t => ({ id: t._id.toString(), ticketCode: t.ticketCode }))
      });
    }

    if (order.amount <= 0) return res.status(400).json({ message: 'This order is free' });

    // Demo-only payment: no card/UPI details are stored and no real money is moved.
    order.providerPaymentId = makeDemoPaymentId();
    order.demoPaymentMethod = paymentMethod;
    const tickets = await issueTickets(order);

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
