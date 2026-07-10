-- Manually confirm an account stuck by the cross-device confirmation bug.
update auth.users
set email_confirmed_at = coalesce(email_confirmed_at, now())
where email = 'jonasli3412@gmail.com';

-- verify it worked (email_confirmed_at should now be a timestamp, not null):
select email, email_confirmed_at from auth.users where email = 'jonasli3412@gmail.com';
