"""Exercise real SQLite constraints and concurrent capacity reservations."""
import sqlite3
import tempfile
from contextlib import contextmanager
import unittest
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


@contextmanager
def database(path, timeout=10):
    db = sqlite3.connect(path, timeout=timeout)
    try:
        with db:
            yield db
    finally:
        db.close()


class RegistrationSecurityTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.path = Path(self.temp.name) / "security.sqlite"
        with database(self.path) as db:
            db.executescript((ROOT / "database/schema.sql").read_text(encoding="utf-8"))
            db.executescript((ROOT / "migrations/0002_auth.sql").read_text(encoding="utf-8"))
            db.execute("insert into sessions values ('legacy-token', 'legacy-user', '', '')")
            db.executescript((ROOT / "migrations/0004_security.sql").read_text(encoding="utf-8"))
            db.execute("insert into events (id, title, total_tickets, ticket_price_cents) values ('free', 'Free', 2, 0)")
            db.execute("insert into events (id, title, total_tickets, ticket_price_cents) values ('paid', 'Paid', 2, 2500)")

    def tearDown(self):
        self.temp.cleanup()

    def register(self, code, quantity=1, event="free", paid=0):
        try:
            with database(self.path, timeout=10) as db:
                db.execute("insert into event_registrations values (?, ?, 'Visitor', 'visitor@example.com', ?, ?, ?, '')", (code, event, quantity, paid, code))
            return True
        except sqlite3.IntegrityError:
            return False

    def test_concurrent_requests_cannot_oversell(self):
        with ThreadPoolExecutor(max_workers=8) as pool:
            result = list(pool.map(lambda i: self.register(str(i)), range(8)))
        self.assertEqual(sum(result), 2)
        with database(self.path) as db:
            self.assertEqual(db.execute("select tickets_sold from events where id='free'").fetchone()[0], 2)
            self.assertEqual(db.execute("select sum(ticket_quantity) from event_registrations").fetchone()[0], 2)

    def test_invalid_quantities_and_forged_payments_are_rejected(self):
        for quantity in [-1, 0, 1.5, 21]:
            self.assertFalse(self.register(str(quantity), quantity))
        self.assertFalse(self.register("paid-event", event="paid"))
        self.assertFalse(self.register("forged-payment", paid=2500))
        self.assertFalse(self.register("nonexistent", event="missing"))
        with database(self.path) as db:
            self.assertEqual(db.execute("select count(*) from event_registrations").fetchone()[0], 0)

    def test_legacy_sessions_are_invalidated(self):
        with database(self.path) as db:
            self.assertEqual(db.execute("select count(*) from sessions").fetchone()[0], 0)


if __name__ == "__main__":
    unittest.main()
