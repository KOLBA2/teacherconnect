-- TeacherConnection database schema
-- Target: PostgreSQL 13+
--
-- IMPORTANT (Windows especially): this app stores Georgian text. Postgres
-- clusters initialized under a non-UTF8 system locale can silently default to
-- an encoding like WIN1252, which cannot represent Georgian script at all —
-- the data gets corrupted to "?????" on insert with no error. Before running
-- this file, confirm the target database is UTF8:
--   SELECT pg_encoding_to_char(encoding) FROM pg_database WHERE datname = current_database();
-- If it isn't, create the database explicitly, e.g.:
--   CREATE DATABASE teacherconnection WITH ENCODING 'UTF8' TEMPLATE template0;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE user_role AS ENUM ('admin', 'teacher', 'student');
CREATE TYPE teacher_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE report_status AS ENUM ('open', 'resolved');

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    personal_id CHAR(11) NOT NULL UNIQUE,
    role user_role NOT NULL DEFAULT 'student',
    is_blocked BOOLEAN NOT NULL DEFAULT FALSE,
    -- Monetization / referral: teachers get a unique code on registration;
    -- referred_by stores the code they signed up under; vip_until tracks
    -- earned/purchased premium status (multiple NULL referral_codes are OK).
    referral_code VARCHAR(12) UNIQUE,
    referred_by VARCHAR(12),
    -- User-level premium windows: vip_until (VIP, also earned via referrals),
    -- vip_plus_until (Ultimate tier). VIP+ profile extras below.
    vip_until TIMESTAMPTZ,
    vip_plus_until TIMESTAMPTZ,
    video_intro_url VARCHAR(255),
    profile_banner VARCHAR(255),
    cover_image_url VARCHAR(255),
    audio_intro_url VARCHAR(255),
    avatar_url VARCHAR(255),
    bio TEXT,
    -- Smart contact channels (per teacher). Standard posts scrub these
    -- entirely (blurred lock in the UI); VIP/VIP+ unlock them.
    phone_num VARCHAR(32),
    whatsapp_num VARCHAR(32),
    telegram_username VARCHAR(64),
    messenger_url VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE users ADD CONSTRAINT personal_id_format CHECK (personal_id ~ '^\d{11}$');

CREATE INDEX idx_users_referred_by ON users (referred_by);

CREATE TABLE teacher_profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    status teacher_status NOT NULL DEFAULT 'pending',
    verification_photos TEXT[] NOT NULL DEFAULT '{}',
    rejected_reason TEXT,
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    -- Premium packaging: 'standard' (default), 'vip', or 'vip_plus'.
    -- active_until is the paid window ("monthly fee"); NULL means no expiry.
    package_type VARCHAR(16) NOT NULL DEFAULT 'standard'
        CHECK (package_type IN ('standard', 'vip', 'vip_plus')),
    active_until TIMESTAMPTZ,
    -- Matching engine: grade levels (target_audience), price, format, subject.
    -- target_audience values: 'elementary' | 'high_school' | 'exam_prep'.
    target_audience TEXT[] NOT NULL DEFAULT '{}',
    price INTEGER,
    format VARCHAR(16) CHECK (format IS NULL OR format IN ('online', 'in_person', 'both')),
    subject VARCHAR(64),
    -- Physical city ('online' or a city key) + bump-up timestamp.
    city VARCHAR(64),
    last_bumped_at TIMESTAMPTZ,
    -- Feature 1: PDF syllabus / program link (any teacher).
    syllabus_url VARCHAR(255),
    -- Post image attachment (VIP/VIP+); served from /uploads/images.
    image_url VARCHAR(255),
    -- VIP promo/discount banner (per post); NULL promo_expires_at = no expiry.
    promo_tag VARCHAR(120),
    promo_expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_posts_package ON posts (package_type, active_until);
CREATE INDEX idx_posts_target_audience ON posts USING GIN (target_audience);
CREATE INDEX idx_posts_subject ON posts (subject);
CREATE INDEX idx_posts_last_bumped ON posts (last_bumped_at);

-- Item 4: weekly recurring availability matrix (VIP/VIP+ teachers).
CREATE TABLE weekly_availability (
    teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    hour SMALLINT NOT NULL CHECK (hour BETWEEN 0 AND 23),
    PRIMARY KEY (teacher_id, day_of_week, hour)
);
CREATE INDEX idx_weekly_availability_teacher ON weekly_availability (teacher_id);

CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    status report_status NOT NULL DEFAULT 'open',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- One OPEN report per user per post; once a report is resolved the same
-- user may report the post again if it becomes problematic later.
CREATE UNIQUE INDEX idx_reports_unique_open ON reports (post_id, reporter_id) WHERE status = 'open';

CREATE TABLE ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    stars SMALLINT NOT NULL CHECK (stars BETWEEN 1 AND 5),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (post_id, user_id)
);

CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    -- A VIP teacher may pin one review per post to the top.
    is_featured BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

-- At most one featured comment per post.
CREATE UNIQUE INDEX idx_comments_one_featured ON comments (post_id) WHERE is_featured;

-- Traffic + conversion log for teacher analytics. A row with NULL
-- clicked_contact is a page view (unique per session per post); a row with it
-- set is a contact-button click (may repeat).
CREATE TABLE post_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    viewer_session_id VARCHAR(64),
    clicked_contact VARCHAR(32),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_post_views_post_id ON post_views (post_id);
CREATE UNIQUE INDEX idx_post_views_unique_view
    ON post_views (post_id, viewer_session_id) WHERE clicked_contact IS NULL;
CREATE INDEX idx_post_views_clicks
    ON post_views (post_id, clicked_contact) WHERE clicked_contact IS NOT NULL;

CREATE TABLE saved_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, post_id)
);

CREATE TABLE slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    is_booked BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (end_time > start_time)
);

CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slot_id UUID NOT NULL UNIQUE REFERENCES slots(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ratings_post_id ON ratings (post_id);
CREATE INDEX idx_comments_post_id ON comments (post_id);
CREATE INDEX idx_saved_posts_user_id ON saved_posts (user_id);
CREATE INDEX idx_slots_teacher_id ON slots (teacher_id);
CREATE INDEX idx_bookings_student_id ON bookings (student_id);

CREATE INDEX idx_posts_teacher_id ON posts (teacher_id);
CREATE INDEX idx_teacher_profiles_status ON teacher_profiles (status);
CREATE INDEX idx_reports_status ON reports (status);
