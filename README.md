# Fight Club CRM

A modern Contact Relationship Management (CRM) application built with Next.js 14 for managing people, companies, schools, donations, certifications, and notes for Fight Club programs.

**Version:** 0.2.0

## Features

### Core Functionality

- **People Management** - Track contacts with detailed profiles, associations, and history
- **Company Management** - Manage organizations with associated contacts and donations
- **School Management** - Track schools with associated people
- **Donation Tracking** - Record and monitor donations from individuals and companies
- **Certification Management** - Track FC certification status, background checks, applications, and training
- **Notes System** - Add contextual notes to any person, company, or school
- **User Management** - Role-based access control with admin and standard user roles

### Modern UX Features

- **Inline Editing** - Edit contact information directly on detail pages without navigation
- **Bidirectional Associations** - Link people to companies/schools from either side
- **No-Tab Interface** - All information visible at a glance with vertical card stacking
- **Quick Actions** - Add/remove associations with inline search dropdowns
- **Saved Views** - Save and reuse complex filter combinations
- **Import/Export** - CSV import and export functionality for bulk operations

## Tech Stack

- **Framework:** Next.js 14.2.5 (App Router)
- **Database:** PostgreSQL via @vercel/postgres (Neon-compatible)
- **Authentication:** NextAuth v5 (beta)
- **Styling:** Tailwind CSS with Radix UI components
- **Icons:** Lucide React
- **Language:** JavaScript (ES6+)

## Prerequisites

- Node.js 18.x or higher
- PostgreSQL database (local or hosted like Neon, Vercel Postgres, etc.)
- npm or yarn package manager

## Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd cms
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   Create a `.env.local` file in the root directory:

   ```env
   # Database (required)
   POSTGRES_URL=your_pooled_connection_string
   POSTGRES_URL_NON_POOLING=your_direct_connection_string

   # NextAuth (required)
   AUTH_SECRET=your_random_secret_key
   NEXTAUTH_URL=http://localhost:3000

   # Optional
   SETUP_SECRET=your_setup_secret
   ```

4. **Initialize the database**

   ```bash
   npm run init-db
   ```

5. **Seed sample data (optional)**

   ```bash
   npm run seed
   ```

6. **Start the development server**

   ```bash
   npm run dev
   ```

7. **Open your browser**

   Navigate to [http://localhost:3000](http://localhost:3000)

## Development Commands

```bash
npm run dev          # Start development server (localhost:3000)
npm run build        # Create production build
npm run start        # Start production server
npm run lint         # Run ESLint
npm run init-db      # Initialize/reset database schema
npm run seed         # Seed sample data
npm run import-data  # Import data from CSV files
```

## Project Structure

```
cms/
├── app/                          # Next.js App Router pages
│   ├── api/                      # API routes
│   │   ├── people/              # People endpoints
│   │   ├── companies/           # Company endpoints
│   │   ├── schools/             # School endpoints
│   │   ├── donations/           # Donation endpoints
│   │   ├── certifications/      # Certification endpoints
│   │   ├── notes/               # Notes endpoints
│   │   └── auth/                # Authentication endpoints
│   ├── people/                  # People pages
│   ├── companies/               # Company pages
│   ├── schools/                 # School pages
│   ├── donations/               # Donation pages
│   ├── certifications/          # Certification pages
│   ├── settings/                # Settings pages
│   └── layout.js                # Root layout
├── components/                   # React components
│   ├── ui/                      # Radix UI components
│   ├── layout/                  # Layout components (Sidebar, Header)
│   ├── people/                  # People-specific components
│   ├── companies/               # Company-specific components
│   ├── donations/               # Donation-specific components
│   ├── notes/                   # Notes components
│   └── shared/                  # Shared components
├── lib/                         # Utility libraries
│   ├── db.js                   # Database helper functions
│   ├── auth.js                 # Authentication configuration
│   ├── utils.js                # Utility functions
│   ├── init-db.js              # Database initialization script
│   ├── seed.js                 # Data seeding script
│   └── import-csv.js           # CSV import script
├── public/                      # Static assets
├── middleware.js                # NextAuth middleware
└── package.json                 # Project dependencies
```

## Database Schema

### Core Tables

- **people** - Contact information and status flags
- **companies** - Organization details
- **schools** - School information
- **donations** - Donation records
- **certifications** - FC certification tracking
- **notes** - Contextual notes for any entity
- **person_types** - Custom contact categories
- **users** - Application users with authentication

### Junction Tables

- **person_companies** - Many-to-many relationship between people and companies
- **person_schools** - Many-to-many relationship between people and schools
- **person_type_assignments** - Many-to-many relationship between people and types
- **saved_views** - User-saved filter configurations

## API Endpoints

All API routes follow RESTful conventions:

```
GET    /api/people              # List all people (with pagination/filters)
POST   /api/people              # Create new person
GET    /api/people/:id          # Get person details
PUT    /api/people/:id          # Update person
DELETE /api/people/:id          # Delete person

GET    /api/companies           # List all companies
POST   /api/companies           # Create new company
GET    /api/companies/:id       # Get company details
PUT    /api/companies/:id       # Update company
DELETE /api/companies/:id       # Delete company
POST   /api/companies/:id/people    # Add person to company
DELETE /api/companies/:id/people    # Remove person from company

GET    /api/schools             # List all schools
POST   /api/schools             # Create new school
GET    /api/schools/:id         # Get school details
PUT    /api/schools/:id         # Update school
DELETE /api/schools/:id         # Delete school
POST   /api/schools/:id/people      # Add person to school
DELETE /api/schools/:id/people      # Remove person from school

# Similar patterns for donations, certifications, notes
```

## Authentication & Authorization

- **NextAuth v5** handles authentication with credential-based login
- **Role-based access:** Admin and standard user roles
- **Protected routes:** Middleware enforces authentication on all routes except login/register
- **Password security:** bcryptjs for password hashing

### Default Admin Account

After running `npm run seed`, a default admin account is created:

- Email: `admin@example.com`
- Password: `password123`

⚠️ **Change these credentials immediately in production!**

## Import/Export

### CSV Import

The application supports importing data from CSV files:

- Place CSV files in `/public/resources/` or `/resources/`
- Use the Import dialog in the UI or run `npm run import-data`
- Supported entities: People, Schools, Companies, Donations

### CSV Export

Export filtered data to CSV from any list view using the Export button.

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub/GitLab/Bitbucket
2. Import project in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy!

### Environment Variables for Production

```env
POSTGRES_URL=<your_production_database_url>
POSTGRES_URL_NON_POOLING=<your_production_database_url_non_pooling>
AUTH_SECRET=<generate_secure_random_string>
NEXTAUTH_URL=https://your-domain.com
```

### Database Setup

1. Run migrations: `npm run init-db`
2. Create initial admin user through registration or seed script

## UX Design Patterns

### Navigation

- **Main Navigation:** Dashboard, People, Companies, Schools, Donations, Certifications, Settings
- **Settings:** Person Types, Users (admin only)

### Detail Pages

- **Layout:** Info card on left, related data cards stacked vertically on right
- **No Tabs:** All information visible without switching tabs
- **Inline Editing:** Click edit icon on any card to modify in place
- **Quick Actions:** Add/remove associations without leaving the page

### Association Management

- **Bidirectional:** Link people to companies from either the person or company page
- **Inline Search:** Type-ahead search dropdowns for quick associations
- **Instant Feedback:** Toast notifications confirm all actions

## Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## Troubleshooting

### Database Connection Issues

- Verify `POSTGRES_URL` is correct in `.env.local`
- Ensure database is accessible from your network
- Check that database tables are initialized (`npm run init-db`)

### Build Errors

- Clear Next.js cache: `rm -rf .next`
- Reinstall dependencies: `rm -rf node_modules && npm install`
- Check Node.js version: `node --version` (should be 18+)

### Authentication Issues

- Verify `AUTH_SECRET` is set in environment variables
- Check `NEXTAUTH_URL` matches your domain
- Clear browser cookies and try again

## License

Proprietary - All rights reserved

## Support

For questions or issues, please contact the development team.
