"""Registry tables: pseudonymized astronauts, missions and devices. No real names are stored."""

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class Astronaut(Base):
    __tablename__ = "astronauts"

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    pseudonym: Mapped[str] = mapped_column(String(80))
    role: Mapped[str | None] = mapped_column(String(80), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Mission(Base):
    __tablename__ = "missions"

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    destination: Mapped[str | None] = mapped_column(String(40), nullable=True)
    phase: Mapped[str] = mapped_column(String(20))
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Device(Base):
    __tablename__ = "devices"

    id: Mapped[str] = mapped_column(String(60), primary_key=True)
    kind: Mapped[str] = mapped_column(String(40))
    name: Mapped[str] = mapped_column(String(120))
    assigned_to: Mapped[str | None] = mapped_column(ForeignKey("astronauts.id", ondelete="SET NULL"), nullable=True)
    mission_id: Mapped[str | None] = mapped_column(ForeignKey("missions.id", ondelete="SET NULL"), nullable=True)
    data_origin: Mapped[str] = mapped_column(String(20))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
