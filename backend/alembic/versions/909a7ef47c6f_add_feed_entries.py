"""add_feed_entries

Revision ID: 909a7ef47c6f
Revises: ace134487c31
Create Date: 2026-06-19 15:37:59.049838

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '909a7ef47c6f'
down_revision: Union[str, None] = 'ace134487c31'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'feed_entries',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('entry_type', sa.String(length=30), nullable=False),
        sa.Column('period', sa.String(length=10), nullable=False),
        sa.Column('title', sa.String(), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('entry_type', 'period', name='uq_feed_entry'),
    )


def downgrade() -> None:
    op.drop_table('feed_entries')
