-- Administrator bootstrap, not an application migration. No passwords here.
-- Give dedicated migration login membership of examination_owner (SET ROLE),
-- runtime login membership of examination_runtime, and CREATE on this database to owner.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_roles
    WHERE rolname = 'examination_owner'
  ) THEN
    CREATE ROLE examination_owner
      NOLOGIN
      NOSUPERUSER
      NOCREATEDB
      NOCREATEROLE
      NOREPLICATION
      NOBYPASSRLS;
  END IF;
  IF NOT EXISTS (
    SELECT FROM pg_roles
    WHERE rolname = 'examination_runtime'
  ) THEN
    CREATE ROLE examination_runtime
      NOLOGIN
      NOSUPERUSER
      NOCREATEDB
      NOCREATEROLE
      NOREPLICATION
      NOBYPASSRLS;
  END IF;
  IF NOT EXISTS (
    SELECT FROM pg_roles
    WHERE rolname = 'examination_operator'
  ) THEN
    CREATE ROLE examination_operator
      NOLOGIN
      NOSUPERUSER
      NOCREATEDB
      NOCREATEROLE
      NOREPLICATION
      NOBYPASSRLS;
  END IF;
  IF NOT EXISTS (
    SELECT FROM pg_roles
    WHERE rolname = 'examination_mail_worker'
  ) THEN
    CREATE ROLE examination_mail_worker
      NOLOGIN
      NOSUPERUSER
      NOCREATEDB
      NOCREATEROLE
      NOREPLICATION
      NOBYPASSRLS;
  END IF;
  IF NOT EXISTS (
    SELECT FROM pg_roles
    WHERE rolname = 'examination_expiry_worker'
  ) THEN
    CREATE ROLE examination_expiry_worker
      NOLOGIN
      NOSUPERUSER
      NOCREATEDB
      NOCREATEROLE
      NOREPLICATION
      NOBYPASSRLS;
  END IF;
END
$$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_roles
    WHERE rolname = 'examination_dispatch_worker'
  ) THEN
    CREATE ROLE examination_dispatch_worker
      NOLOGIN
      NOSUPERUSER
      NOCREATEDB
      NOCREATEROLE
      NOREPLICATION
      NOBYPASSRLS;
  END IF;
END
$$;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_roles
    WHERE rolname = 'examination_assessment_maintenance'
  ) THEN
    CREATE ROLE examination_assessment_maintenance
      NOLOGIN
      NOSUPERUSER
      NOCREATEDB
      NOCREATEROLE
      NOREPLICATION
      NOBYPASSRLS;
  END IF;
END
$$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_roles
    WHERE rolname = 'examination_grading_worker'
  ) THEN
    CREATE ROLE examination_grading_worker
      NOLOGIN
      NOSUPERUSER
      NOCREATEDB
      NOCREATEROLE NOREPLICATION NOBYPASSRLS;
  END IF;
END
$$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'examination_grading_recovery') THEN
    CREATE ROLE examination_grading_recovery
      NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
  END IF;
END
$$;
