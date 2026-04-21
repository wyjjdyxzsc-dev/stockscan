from sqlalchemy import Column, String, Float, Integer, DateTime
from sqlalchemy.sql import func
from database import Base
import uuid

def gen_id():
    return str(uuid.uuid4())

class Employee(Base):
    __tablename__ = "employees"
    id         = Column(String, primary_key=True, default=gen_id)
    name       = Column(String, nullable=False, unique=True)
    pin_hash   = Column(String, nullable=False)
    role       = Column(String, nullable=False, default="employee")
    created_at = Column(DateTime, server_default=func.now())

class InventoryItem(Base):
    __tablename__ = "inventory"
    id         = Column(String, primary_key=True, default=gen_id)
    barcode    = Column(String, nullable=False, unique=True, index=True)
    name       = Column(String, nullable=False)
    price      = Column(Float, nullable=False)
    quantity   = Column(Integer, nullable=False, default=0)
    category   = Column(String, nullable=True)
    image_path = Column(String, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

class Sale(Base):
    __tablename__ = "sales"
    id           = Column(String, primary_key=True, default=gen_id)
    item_id      = Column(String, nullable=False)
    barcode      = Column(String, nullable=False)
    item_name    = Column(String, nullable=False)
    price        = Column(Float, nullable=False)
    quantity     = Column(Integer, nullable=False)
    sold_by      = Column(String, nullable=False)
    sold_by_name = Column(String, nullable=False)
    sold_at      = Column(DateTime, server_default=func.now())
