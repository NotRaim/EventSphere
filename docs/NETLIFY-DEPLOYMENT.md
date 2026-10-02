# EventSphere — Free Netlify Deployment

## Architecture

- Frontend: Netlify static hosting (`client/`)
- Backend: Netlify Function wrapping the existing Express API
- Database: MongoDB Atlas
- Payment: Demo mode (no Razorpay/PAN required)
- Ticket QR verification: Netlify Function `/verify/:code`
- Persistent event images: Cloudinary recommended for production/serverless deployments

## 1. Prepare MongoDB Atlas

Keep the same MongoDB database used locally. Make sure its Network Access rules allow the deployed backend to connect. For a simple student/demo deployment, use an appropriate Atlas access rule for your project and do not expose database credentials publicly.

## 2. Create the Netlify site

Recommended: connect a GitHub repository to Netlify. Netlify can also deploy this folder manually, but Git deployment is easier for future updates.

The included `netlify.toml` already configures:

- publish directory: `client`
- Functions directory: `server/netlify/functions`
- `/api/*` → Express function
- `/verify/*` → Express ticket verification function

## 3. Set Netlify environment variables

In Netlify: Site configuration → Environment variables.

Set:

```text
NODE_ENV=production
PAYMENT_MODE=demo
MONGODB_URI=YOUR_MONGODB_ATLAS_URI
JWT_SECRET=LONG_RANDOM_SECRET
JWT_EXPIRES_IN=7d
TICKET_SIGNING_SECRET=ANOTHER_LONG_RANDOM_SECRET
ADMIN_NAME=EventSphere Admin
ADMIN_EMAIL=YOUR_ADMIN_EMAIL
ADMIN_PASSWORD=YOUR_ADMIN_PASSWORD
CLIENT_ORIGIN=https://YOUR-SITE.netlify.app
PUBLIC_BASE_URL=https://YOUR-SITE.netlify.app
```

After the first deploy, replace `YOUR-SITE.netlify.app` with the actual Netlify URL and redeploy.

Do not commit `.env` or put secrets in client-side JavaScript.

## 4. Cloudinary for organizer image uploads

Netlify Functions do not provide durable local filesystem storage. EventSphere already supports Cloudinary. For persistent event cover uploads, create a Cloudinary account and set:

```text
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
```

Without Cloudinary, local `/uploads` files should not be treated as permanent production storage.

## 5. Deploy

If using GitHub:

1. Push the `EventSphere` folder to a repository.
2. Netlify → Add new project → Import an existing project.
3. Select the repository.
4. Netlify reads `netlify.toml`.
5. Publish/deploy.
6. Set the environment variables above.
7. Redeploy after setting the variables.

## 6. Test

Open:

```text
https://YOUR-SITE.netlify.app
```

Then test:

```text
https://YOUR-SITE.netlify.app/api/health
```

The health response should show the database as connected.

Then test:

- Register/login
- Admin login
- Organizer event creation
- Event editing/cancellation
- Demo booking
- Ticket generation
- Ticket PDF download
- QR verification
- Check-in
- Profile/password change
- Contact admin

## Important limitations

The demo payment system does not charge real money. Netlify is serving the backend as serverless functions, not as a permanent Node.js process. For this EventSphere project that is compatible with the API architecture, but persistent uploads should use Cloudinary rather than local disk.
