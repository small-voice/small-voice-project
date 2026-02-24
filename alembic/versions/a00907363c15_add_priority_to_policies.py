"""add priority to policies

Revision ID: a00907363c15
Revises: 106e4f74785d
Create Date: 2026-02-25 00:19:59.803140

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a00907363c15'
down_revision: Union[str, Sequence[str], None] = '106e4f74785d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('policies', sa.Column('priority', sa.String(), nullable=True, server_default='medium'))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('policies', 'priority')
