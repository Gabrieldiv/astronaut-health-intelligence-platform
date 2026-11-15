"""Initial schema: registry (astronauts, missions, devices) and health observations.

Revision ID: 0001_initial
Revises:
Create Date: 2026-11-15
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0001_initial"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "astronauts",
        sa.Column("id", sa.String(40), primary_key=True),
        sa.Column("pseudonym", sa.String(80), nullable=False),
        sa.Column("role", sa.String(80), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_table(
        "missions",
        sa.Column("id", sa.String(40), primary_key=True),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("destination", sa.String(40), nullable=True),
        sa.Column("phase", sa.String(20), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_table(
        "devices",
        sa.Column("id", sa.String(60), primary_key=True),
        sa.Column("kind", sa.String(40), nullable=False),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("assigned_to", sa.String(40), sa.ForeignKey("astronauts.id", ondelete="SET NULL"), nullable=True),
        sa.Column("mission_id", sa.String(40), sa.ForeignKey("missions.id", ondelete="SET NULL"), nullable=True),
        sa.Column("data_origin", sa.String(20), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_table(
        "health_observations",
        sa.Column("observation_id", sa.String(80), primary_key=True),
        sa.Column("subject_id", sa.String(40), nullable=False),
        sa.Column("mission_id", sa.String(40), nullable=True),
        sa.Column("device_id", sa.String(60), nullable=True),
        sa.Column("metric_code", sa.String(40), nullable=False),
        sa.Column("value", sa.Float(), nullable=True),
        sa.Column("unit", sa.String(20), nullable=False),
        sa.Column("measured_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("received_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("data_origin", sa.String(20), nullable=False),
        sa.Column("source_reference", sa.JSON(), nullable=False),
        sa.Column("quality_status", sa.String(20), nullable=False),
        sa.Column("quality_confidence", sa.Float(), nullable=False),
        sa.Column("is_estimated", sa.Boolean(), nullable=False),
        sa.Column("context", sa.JSON(), nullable=False),
        sa.Column("metadata", sa.JSON(), nullable=False),
        sa.Column("payload_sha256", sa.String(64), nullable=False),
        sa.Column("ingested_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("data_origin IN ('REAL_PUBLIC','DERIVED','SIMULATED','MANUAL')", name="ck_obs_data_origin"),
    )
    op.create_index("ix_obs_subject_metric_time", "health_observations", ["subject_id", "metric_code", "measured_at"])


def downgrade() -> None:
    op.drop_index("ix_obs_subject_metric_time", table_name="health_observations")
    op.drop_table("health_observations")
    op.drop_table("devices")
    op.drop_table("missions")
    op.drop_table("astronauts")
