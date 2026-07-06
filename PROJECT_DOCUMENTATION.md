# EduMatch Project Documentation

## 1. Project Overview

EduMatch is a web platform that connects students with instructors. Students can create learning requests, instructors can apply to normal/group requests or accept instant requests, sessions are created after an instructor is selected, payments are simulated through an escrow-style flow, users can chat, complete sessions, leave reviews, receive notifications, and admins can manage the platform.

EduMatch is a graduation project MVP. It is built as a web platform for three main roles: students, instructors, and admins. Payments are simulated only, and no real payment gateway is integrated.

## 2. Problem Statement

Students often need help from qualified instructors, but finding a suitable instructor can be difficult, slow, and unorganized. Students may need to search manually, compare options without clear information, negotiate prices, and communicate across separate tools.

EduMatch solves this by providing one organized platform for requests, instructor applications, sessions, simulated payments, chat, reviews, notifications, and admin control.

## 3. Project Objectives

- Help students find instructors easily.
- Allow instructors to find teaching opportunities.
- Support normal, group, and instant learning requests.
- Simulate an escrow payment flow.
- Provide communication through chat.
- Provide reviews and ratings.
- Provide admin management and moderation.
- Make the system scalable, organized, and suitable for a graduation project MVP.

## 4. User Roles

### Student

- Register and login.
- Create requests.
- Browse instructors.
- Accept or reject instructor applications.
- Pay simulated escrow payments.
- Chat with instructors.
- Complete sessions.
- Review instructors.
- Join group requests.
- Create instant requests.

### Instructor

- Register and login.
- Browse requests.
- Apply to requests.
- Accept instant requests.
- Manage sessions.
- Chat with students.
- Mark sessions completed.
- View wallet and reviews.

### Admin

- View dashboard statistics.
- Manage users.
- Verify or reject instructors.
- Suspend or activate users.
- View requests, sessions, payments, and reviews.
- Refund or release held payments.
- Hide or show reviews.

## 5. System Features

### Authentication and Authorization

- JWT authentication is used for protected API access.
- Role-based routes separate student, instructor, and admin dashboards.
- Protected APIs check authentication and permissions.
- Suspended users are blocked from using the system.
- Public admin registration is blocked.

### Normal Requests

- Student creates a normal learning request.
- Instructor browses open requests and applies.
- Student reviews applications.
- Student accepts an instructor.
- A session is created after the accepted application.

### Group Requests

- Student creates a group request.
- The request owner becomes the first participant.
- Other students can join the group request.
- Instructor applies to the group request.
- Owner accepts an instructor.
- Participants pay their own shares.
- The session becomes ready after all active participants pay.

Group pricing formula:

```txt
price_per_student = max(min_price_per_student, ceil(base_price / active_participants_count))
```

### Instant Requests

- Student creates an urgent request.
- The instant request expires after a time limit.
- Available instructors can see and accept it.
- The first instructor to accept wins.
- A session is created.
- Student pays using the simulated payment flow.

### Sessions

- Sessions are created after an accepted application or accepted instant request.
- Sessions can be started.
- Instructor can mark a session completed.
- Student confirms completion.

### Payments and Wallet

- Payments are simulated.
- Student payment is held in escrow.
- Instructor wallet pending balance increases when payment is held.
- Payment is released after session completion confirmation.
- Admin can refund or release held payments where supported.

### Chat

- Chat messages are stored in the database.
- Session chat is available for session participants.
- Application/applicant chat is available where implemented.
- Polling is used for updates.
- WebSockets are not used.

### Reviews and Ratings

- Student can review an instructor after a completed session.
- Instructor rating is recalculated from visible reviews.
- Admin can hide or show reviews.

### Notifications

- Notifications are stored in the database.
- Users can view notifications through a dropdown and notifications page.
- Polling runs every 30 seconds.

### Admin Dashboard

- Admin dashboard shows read-only platform statistics.
- Admin can view users, requests, sessions, payments, and reviews.
- Admin actions include instructor verification, user suspension/activation, payment refund/release, and review moderation.

## 6. Technology Stack

Frontend:

- React
- Vite
- TypeScript
- Tailwind CSS
- ShadCN UI
- React Router
- Axios
- Lucide React

Backend:

- FastAPI
- SQLAlchemy
- Alembic
- PostgreSQL
- Pydantic
- JWT Authentication
- Uvicorn

Database:

- PostgreSQL
- Neon for hosted deployment

Deployment:

- Frontend: Vercel
- Backend: Railway 
- Database: Neon PostgreSQL

## 7. System Architecture

The frontend communicates with the backend using REST APIs. The backend handles authentication, validation, business logic, and database access. PostgreSQL stores all structured platform data. JWT tokens are used for authenticated requests.

```txt
Frontend React/Vite
↓ Axios HTTP Requests
FastAPI Backend
↓ SQLAlchemy ORM
PostgreSQL Database
```

## 8. Data Structure

### Database Architecture

EduMatch uses a relational PostgreSQL database. PostgreSQL was selected because the system has structured entities and relationships such as users, requests, applications, sessions, payments, reviews, and notifications.

No CSV dataset is used. Data is collected from user interactions and stored in database tables.

### Key Entities

- users
- student_profiles
- instructor_profiles
- requests
- applications
- sessions
- payments
- instructor_wallets
- wallet_transactions
- messages
- reviews
- notifications
- group_participants

### Key Relationships

- User has one student or instructor profile.
- Student creates many requests.
- Request has many applications.
- Application belongs to an instructor and a request.
- Accepted application creates a session.
- Session has payments, messages, and reviews.
- Instructor has a wallet.
- Wallet has transactions.
- Request has group participants.
- User has notifications.

### Data Flow

User registers, then the appropriate profile is created. A student creates a request. An instructor applies to the request or accepts an instant request. A session is created after acceptance. The student pays and the payment is held. Student and instructor chat during the session. After completion, payment is released to the instructor, a review is submitted, and notifications are created for important events.

## 9. Security

- Passwords are hashed before storage.
- JWT authentication protects private routes.
- Role-based access control separates student, instructor, and admin permissions.
- Admin APIs are protected.
- Password hashes and tokens are not returned in normal API responses.
- `.env` files are not committed.
- CORS is configured for the frontend domain.

## 10. Limitations

- Payments are simulated.
- No real payment gateway is integrated.
- WebSockets are not used.
- Email, SMS, and push notifications are not integrated.
- Video meeting integration is not included.
- File attachments are not included.
- Manual testing is still required.

## 11. Future Work

- Real payment gateway integration.
- Real-time WebSocket chat.
- Email and SMS notifications.
- Video meeting integration.
- File attachments.
- Advanced dispute system.
- Advanced analytics.
- Mobile app.
