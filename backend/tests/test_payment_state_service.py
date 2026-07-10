from decimal import Decimal
import unittest

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app.models import LearningRequest, Payment, Session as LearningSession, User  # noqa: F401
from app import models  # noqa: F401
from app.services.payment_state_service import get_session_payment_state


class PaymentStateServiceTests(unittest.TestCase):
    def setUp(self) -> None:
        self.engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(self.engine)
        self.SessionLocal = sessionmaker(bind=self.engine)
        self.db = self.SessionLocal()
        self.student = User(full_name="Student", email="student@test.local", password_hash="x", role="student")
        self.instructor = User(full_name="Instructor", email="instructor@test.local", password_hash="x", role="instructor")
        self.db.add_all([self.student, self.instructor])
        self.db.flush()

    def tearDown(self) -> None:
        self.db.close()
        Base.metadata.drop_all(self.engine)
        self.engine.dispose()

    def create_session_with_payment(self, payment_status: str | None = None) -> LearningSession:
        request = LearningRequest(
            student_id=self.student.id,
            title="Request",
            subject="Math",
            description="Learn math",
            request_type="normal",
            session_mode="individual",
            session_type="online",
            base_price=Decimal("150.00"),
            final_price_per_student=Decimal("150.00"),
            status="waiting_payment",
        )
        self.db.add(request)
        self.db.flush()
        session = LearningSession(
            request_id=request.id,
            student_id=self.student.id,
            instructor_id=self.instructor.id,
            status="waiting_payment",
        )
        self.db.add(session)
        self.db.flush()
        if payment_status is not None:
            self.db.add(
                Payment(
                    session_id=session.id,
                    request_id=request.id,
                    student_id=self.student.id,
                    instructor_id=self.instructor.id,
                    amount=Decimal("150.00"),
                    platform_fee=Decimal("15.00"),
                    total_amount=Decimal("165.00"),
                    status=payment_status,
                )
            )
            self.db.flush()
        return session

    def test_no_payment_can_initiate_payment(self) -> None:
        session = self.create_session_with_payment()
        state = get_session_payment_state(self.db, session, self.student.id)
        self.assertFalse(state.payment_exists)
        self.assertTrue(state.can_initiate_payment)
        self.assertFalse(state.is_successfully_paid)

    def test_pending_payment_does_not_count_as_paid(self) -> None:
        session = self.create_session_with_payment("pending")
        state = get_session_payment_state(self.db, session, self.student.id)
        self.assertEqual(state.payment_status, "pending")
        self.assertTrue(state.can_initiate_payment)
        self.assertFalse(state.is_successfully_paid)

    def test_cancelled_payment_can_retry(self) -> None:
        session = self.create_session_with_payment("cancelled")
        state = get_session_payment_state(self.db, session, self.student.id)
        self.assertTrue(state.can_initiate_payment)
        self.assertTrue(state.can_retry_payment)
        self.assertFalse(state.is_successfully_paid)

    def test_held_payment_blocks_duplicate_payment(self) -> None:
        session = self.create_session_with_payment("held")
        state = get_session_payment_state(self.db, session, self.student.id)
        self.assertFalse(state.can_initiate_payment)
        self.assertTrue(state.is_successfully_paid)
        self.assertTrue(state.session_access_allowed)

    def test_released_payment_blocks_duplicate_payment(self) -> None:
        session = self.create_session_with_payment("released")
        state = get_session_payment_state(self.db, session, self.student.id)
        self.assertFalse(state.can_initiate_payment)
        self.assertTrue(state.is_successfully_paid)
        self.assertTrue(state.session_access_allowed)


if __name__ == "__main__":
    unittest.main()
