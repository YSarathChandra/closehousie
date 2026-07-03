# 🚀 CloseHousie - Cloud Deployment Guide

Deploy your Tambola game to the cloud with just a few clicks!

---

## ☁️ **Option 1: Heroku (EASIEST - Free tier available)**

### Prerequisites
- Heroku account (https://www.heroku.com)
- Git installed
- GitHub account (optional)

### Steps

1. **Install Heroku CLI**
   ```bash
   npm install -g heroku
   heroku login
   ```

2. **Create Heroku App**
   ```bash
   cd C:\dev\CloseHousie\web
   heroku create your-app-name
   ```

3. **Deploy**
   ```bash
   git push heroku main
   ```

4. **Access Your App**
   ```
   https://your-app-name.herokuapp.com
   ```

5. **View Logs**
   ```bash
   heroku logs --tail
   ```

---

## ☁️ **Option 2: Railway (Free tier - $5/month after)**

### Prerequisites
- Railway account (https://railway.app)
- GitHub account

### Steps

1. **Push to GitHub**
   ```bash
   git remote add origin https://github.com/your-username/closehousie.git
   git branch -M main
   git push -u origin main
   ```

2. **Connect Railway**
   - Go to https://railway.app/dashboard
   - Click "New Project"
   - Select "Deploy from GitHub"
   - Connect your repository

3. **Set Environment**
   - Set `PORT` variable in Railway dashboard
   - Railway auto-detects Node.js

4. **Your URL**
   ```
   https://closehousie.up.railway.app (auto-generated)
   ```

---

## ☁️ **Option 3: Render (Free tier available)**

### Prerequisites
- Render account (https://render.com)
- GitHub account

### Steps

1. **Push to GitHub** (same as Railway)

2. **Create Web Service**
   - Go to https://dashboard.render.com
   - Click "New +" → "Web Service"
   - Connect GitHub repo
   - Build command: `npm install`
   - Start command: `npm start`

3. **Set Environment Variables**
   - Add `NODE_ENV` = `production`
   - Add `PORT` = `3000`

4. **Deploy**
   - Render auto-deploys on git push

5. **Your URL**
   ```
   https://closehousie.onrender.com (auto-generated)
   ```

---

## ☁️ **Option 4: AWS (Most Scalable)**

### Using AWS Elastic Beanstalk

#### Prerequisites
- AWS account (https://aws.amazon.com)
- AWS CLI installed

#### Steps

1. **Install AWS EB CLI**
   ```bash
   pip install awsebcli
   ```

2. **Initialize Elastic Beanstalk**
   ```bash
   cd C:\dev\CloseHousie\web
   eb init -p node.js-18 closehousie
   ```

3. **Create Environment**
   ```bash
   eb create closehousie-prod
   ```

4. **Deploy**
   ```bash
   eb deploy
   ```

5. **Get URL**
   ```bash
   eb open
   ```

---

## ☁️ **Option 5: Google Cloud (GCP)**

### Using Cloud Run (Serverless)

#### Prerequisites
- Google Cloud account (https://cloud.google.com)
- Google Cloud CLI installed

#### Steps

1. **Create Dockerfile** (in web directory)
   ```dockerfile
   FROM node:18
   WORKDIR /app
   COPY package*.json ./
   RUN npm install
   COPY . .
   EXPOSE 3000
   CMD ["npm", "start"]
   ```

2. **Deploy to Cloud Run**
   ```bash
   gcloud run deploy closehousie \
     --source . \
     --platform managed \
     --region us-central1 \
     --allow-unauthenticated
   ```

3. **Your URL**
   ```
   https://closehousie-xxxxx.run.app
   ```

---

## ☁️ **Option 6: DigitalOcean (Most Affordable)**

### Using App Platform

#### Prerequisites
- DigitalOcean account (https://www.digitalocean.com)
- GitHub account

#### Steps

1. **Push to GitHub**

2. **Create App**
   - Go to DigitalOcean Dashboard
   - Click "Create" → "Apps"
   - Select GitHub repo
   - Auto-detects Node.js
   - Set port to 3000

3. **Deploy**
   - Click "Deploy"

4. **Your URL**
   ```
   https://closehousie-xxxx.ondigitalocean.app
   ```

#### Cost
- $5/month (includes free Postgres DB)

---

## 🔧 **Environment Variables Needed**

For any cloud platform, set these variables:

```
NODE_ENV=production
PORT=3000
```

Optional but recommended:
```
LOG_LEVEL=info
SESSION_SECRET=your-random-secret-key
```

---

## 📊 **Database Migration (Optional)**

### Current Setup (JSON Files)
- Works for up to 100 concurrent players
- Data stored in `/data` directory
- **Problem**: Data lost when server restarts (Heroku/Railway)

### Upgrade to MongoDB (Recommended for Production)

1. **Create MongoDB Atlas account**
   - https://www.mongodb.com/cloud/atlas
   - Create free cluster

2. **Get Connection String**
   - `mongodb+srv://user:pass@cluster.mongodb.net/closehousie`

3. **Install Package**
   ```bash
   npm install mongoose
   ```

4. **Update server.js**
   - Replace JSON file reads/writes with MongoDB
   - Example schema already prepared

### Quick MongoDB Setup
```javascript
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const gameSchema = new mongoose.Schema({
  id: String,
  joinCode: String,
  hostId: String,
  players: Object,
  drawnNumbers: Array,
  status: String,
  prizePool: Number,
  prizes: Object,
  createdAt: Date,
  startedAt: Date,
  endedAt: Date
});

const Game = mongoose.model('Game', gameSchema);
```

---

## 🔒 **Security Checklist for Production**

- [ ] Set `NODE_ENV=production`
- [ ] Use HTTPS (all platforms provide free SSL)
- [ ] Add rate limiting to API endpoints
- [ ] Use environment variables for secrets
- [ ] Enable CORS only for your domain
- [ ] Add password hashing salt rounds (≥10)
- [ ] Set secure session cookies
- [ ] Regular database backups
- [ ] Monitor error logs
- [ ] Use HTTPS for WebSocket (wss://)

---

## 🆘 **Troubleshooting Cloud Deployment**

### Issue: "Module not found"
```bash
# Ensure node_modules are installed
npm install --production
```

### Issue: Port already in use
- Cloud platforms auto-assign port
- Remove hardcoded port from server.js
- Use `process.env.PORT || 3000`

### Issue: WebSocket connection fails
- Ensure WebSocket is not blocked by firewall
- Check CORS headers
- Use secure WebSocket (wss://) on HTTPS

### Issue: Logs not showing
```bash
# View logs on different platforms:
# Heroku: heroku logs --tail
# Railway: Check dashboard
# Render: Check deployment tab
# GCP: gcloud run logs read closehousie --limit 50
```

### Issue: Data not persisting
- Cloud platforms may have ephemeral storage
- Migrate to MongoDB Atlas (free tier)
- Or use persistent volume option

---

## 📈 **Scaling Recommendations**

| Players | Setup | Cost |
|---------|-------|------|
| 1-50 | Free tier (Heroku/Railway/Render) | Free |
| 50-500 | DigitalOcean App Platform | $5/month |
| 500-5000 | AWS Elastic Beanstalk + RDS | $50/month |
| 5000+ | AWS Auto-scaling + CloudFront | $100+/month |

---

## 🎯 **Recommended Setup for Launch**

**Best Value:**
1. **Backend**: DigitalOcean App Platform ($5/month)
2. **Database**: MongoDB Atlas (free tier)
3. **Domain**: Namecheap ($0.99/year)
4. **SSL**: Auto-provided by DigitalOcean

**Total Cost**: ~$6/month

**Setup Time**: ~15 minutes

---

## 🚀 **Quick Deploy Checklist**

```
✅ Code committed to GitHub
✅ package.json has all dependencies
✅ .gitignore excludes node_modules & data/
✅ Environment variables set
✅ PORT set to process.env.PORT
✅ Server listens on PORT
✅ Testing done locally
✅ WebSocket endpoint works
✅ Database ready (JSON or MongoDB)
✅ Deployed and tested live
```

---

## 🎉 **Your Live Game URL**

Once deployed, share:
```
https://your-app-name.platform.com
```

All game features will work:
- ✅ User authentication
- ✅ Real-time multiplayer
- ✅ Prize calculations
- ✅ Number drawing (3-second display)
- ✅ Ticket marking
- ✅ WebSocket sync

---

## 📞 **Support**

Need help? Common issues:

1. **Can't connect to WebSocket** → Check firewall/CORS
2. **Data lost after restart** → Migrate to MongoDB
3. **Slow performance** → Upgrade tier or add caching
4. **High costs** → Use free tier or DigitalOcean

---

## 🆓 **Free Options (Recommended to Start)**

1. **Heroku** - Easy deployment, free tier (limited)
2. **Railway** - $5 credit/month, free tier
3. **Render** - Free tier with auto-deploy
4. **Glitch** - Great for learning

---

**Choose a platform above and deploy in 5 minutes!** 🚀
