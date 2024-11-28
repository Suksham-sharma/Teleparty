# Video Sync Backend Server

This project is a backend service designed to facilitate real-time synchronization of video playback across users in a shared group or channel. It provides features for channel creation, video uploads, transcoding, and playback synchronization.

---

## Features

### 1. **Authentication**

- Fully implemented authentication system using JWT.
- User registration and login functionalities.
- Secure token-based access to protected resources.

### 2. **Channel Management**

- Users can create and manage channels.
- Multiple users can join a single channel to participate in synchronized playback.

### 3. **Video Upload and Storage**

- Videos are uploaded to **AWS S3**.
- Supports metadata retrieval and secure storage.

### 4. **Video Transcoding**

- Uploaded videos are processed by **FFmpeg** to ensure compatibility and quality .
- Transcoding is handled by a worker process and re-uploaded to S3 after processing/

### 5. **Real-Time Synchronization**

- Real-time playback synchronization between users in a channel using WebSocket.

### 6. Scalability Considerations

- heavy tasks like video transcoding are handled by a separate worker process to ensure the main server remains responsive.
- Utilized Redis Queue for task management.

---

## Environment Variables

The following environment variables are required for the project. Add these to your `.env` file:

```plaintext
PORT=3000

# AWS S3 Configuration
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=your_region
S3_BUCKET_NAME=your_s3_bucket_name

# Database Configuration
DATABASE_URL=your_database_url

# JWT Configuration
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=3600

# Redis Configuration (for worker queue)
REDIS_URL=redis://localhost:6379
```
