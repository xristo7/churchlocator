-- Invalidate old raw-token sessions from the authentication bypass era.
delete from sessions where token not like 'v2:%';

-- Enforce stock changes within the same statement that creates a registration.
create trigger if not exists event_registration_reserve_capacity
before insert on event_registrations
BEGIN
  SELECT (CASE WHEN new.ticket_quantity < 1 or new.ticket_quantity > 20
    or new.ticket_quantity != cast(new.ticket_quantity as integer)
    or new.amount_paid_cents != 0
    then raise(abort, 'invalid registration') END);
  SELECT (CASE WHEN not exists (
    select 1 from events where id = new.event_id and ticket_price_cents = 0
      and (total_tickets is null or total_tickets = 0 or coalesce(tickets_sold, 0) + new.ticket_quantity <= total_tickets)
  ) then raise(abort, 'event unavailable') END);
END;
create trigger if not exists event_registration_count_tickets
after insert on event_registrations
BEGIN
  update events set tickets_sold = coalesce(tickets_sold, 0) + new.ticket_quantity where id = new.event_id;
END;
