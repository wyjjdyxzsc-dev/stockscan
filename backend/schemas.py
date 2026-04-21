from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class EmployeeCreate(BaseModel):
    name: str
    pin: str
    role: str = "employee"
    admin_pin: str = ""

class EmployeeOut(BaseModel):
    id: str
    name: str
    role: str
    model_config = {"from_attributes": True}

class EmployeeUpdate(BaseModel):
    name: Optional[str] = None
    pin: Optional[str] = None
    role: Optional[str] = None
    admin_pin: str

class LoginRequest(BaseModel):
    name: str
    pin: str

class TokenOut(BaseModel):
    token: str
    employee: EmployeeOut

class InventoryCreate(BaseModel):
    barcode: str
    name: str
    price: float
    quantity: int
    category: Optional[str] = None
    image_path: Optional[str] = None

class SaleCreate(BaseModel):
    item_id: str
    quantity: int

class ResetRequest(BaseModel):
    password: str
