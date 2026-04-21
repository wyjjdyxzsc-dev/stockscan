from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Request, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from datetime import datetime
import os, uuid, shutil

import models, schemas, auth
from database import engine, get_db

# ── SETUP ────────────────────────────────────────────────────────────────────
models.Base.metadata.create_all(bind=engine)

UPLOAD_DIR     = os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploads")
RESET_PASSWORD = "07/29/2008"
ALLOWED_EXT    = {"jpg", "jpeg", "png", "gif", "webp"}
os.makedirs(UPLOAD_DIR, exist_ok=True)

app = FastAPI(title="Craftribe Inventory Tracker API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

def img_url(request: Request, path: str | None) -> str | None:
    if not path:
        return None
    return f"{str(request.base_url).rstrip('/')}/uploads/{path}"

# ── PUBLIC: EMPLOYEE LIST (login screen) ─────────────────────────────────────
@app.get("/api/employees/public")
def employees_public(db: Session = Depends(get_db)):
    rows = db.query(models.Employee).all()
    return [{"id": e.id, "name": e.name, "role": e.role} for e in rows]

# ── AUTH ─────────────────────────────────────────────────────────────────────
@app.post("/api/auth/login", response_model=schemas.TokenOut)
def login(data: schemas.LoginRequest, db: Session = Depends(get_db)):
    emp = db.query(models.Employee).filter(models.Employee.name == data.name.strip()).first()
    if not emp or not auth.verify_pin(data.pin, emp.pin_hash):
        raise HTTPException(status_code=401, detail="Invalid name or PIN")
    return {"token": auth.create_token(emp.id), "employee": emp}

# ── EMPLOYEES ─────────────────────────────────────────────────────────────────
@app.get("/api/employees")
def list_employees(
    current: models.Employee = Depends(auth.get_current_employee),
    db: Session = Depends(get_db),
):
    rows = db.query(models.Employee).all()
    return [{"id": e.id, "name": e.name, "role": e.role} for e in rows]

@app.post("/api/employees", status_code=201)
def create_employee(data: schemas.EmployeeCreate, db: Session = Depends(get_db)):
    existing = db.query(models.Employee).all()
    if existing:
        auth.verify_admin_pin_db(db, data.admin_pin)

    if db.query(models.Employee).filter(models.Employee.name == data.name.strip()).first():
        raise HTTPException(status_code=400, detail="Employee name already exists")
    if data.role not in ("admin", "employee"):
        raise HTTPException(status_code=400, detail="Role must be admin or employee")

    emp = models.Employee(
        id=str(uuid.uuid4()),
        name=data.name.strip(),
        pin_hash=auth.hash_pin(data.pin),
        role=data.role,
    )
    db.add(emp)
    db.commit()
    return {"id": emp.id, "name": emp.name, "role": emp.role}

@app.put("/api/employees/{emp_id}")
def update_employee(
    emp_id: str,
    data: schemas.EmployeeUpdate,
    current: models.Employee = Depends(auth.get_current_employee),
    db: Session = Depends(get_db),
):
    auth.verify_admin_pin_db(db, data.admin_pin)
    emp = db.query(models.Employee).filter(models.Employee.id == emp_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    if data.name:
        emp.name = data.name.strip()
    if data.pin:
        emp.pin_hash = auth.hash_pin(data.pin)
    if data.role and data.role in ("admin", "employee"):
        emp.role = data.role
    db.commit()
    return {"ok": True}

@app.delete("/api/employees/{emp_id}")
def delete_employee(
    emp_id: str,
    admin_pin: str = Query(...),
    current: models.Employee = Depends(auth.get_current_employee),
    db: Session = Depends(get_db),
):
    auth.verify_admin_pin_db(db, admin_pin)
    emp = db.query(models.Employee).filter(models.Employee.id == emp_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    db.delete(emp)
    db.commit()
    return {"ok": True}

# ── IMAGE UPLOAD ──────────────────────────────────────────────────────────────
@app.post("/api/upload")
async def upload_image(
    file: UploadFile = File(...),
    current: models.Employee = Depends(auth.get_current_employee),
):
    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
    if ext not in ALLOWED_EXT:
        raise HTTPException(status_code=400, detail="Invalid file type. Use jpg, png, gif or webp")
    filename = f"{uuid.uuid4()}.{ext}"
    with open(os.path.join(UPLOAD_DIR, filename), "wb") as f:
        shutil.copyfileobj(file.file, f)
    return {"filename": filename}

# ── INVENTORY ─────────────────────────────────────────────────────────────────
@app.get("/api/inventory")
def list_inventory(
    request: Request,
    current: models.Employee = Depends(auth.get_current_employee),
    db: Session = Depends(get_db),
):
    items = db.query(models.InventoryItem).all()
    return [{
        "id":         i.id,
        "barcode":    i.barcode,
        "name":       i.name,
        "price":      i.price,
        "quantity":   i.quantity,
        "category":   i.category,
        "image_path": i.image_path,
        "image_url":  img_url(request, i.image_path),
        "updated_at": i.updated_at.isoformat() if i.updated_at else None,
    } for i in items]

@app.post("/api/inventory")
def upsert_inventory(
    data: schemas.InventoryCreate,
    current: models.Employee = Depends(auth.get_current_employee),
    db: Session = Depends(get_db),
):
    now = datetime.utcnow()
    existing = db.query(models.InventoryItem).filter(
        models.InventoryItem.barcode == data.barcode
    ).first()

    if existing:
        existing.name     = data.name
        existing.price    = data.price
        existing.quantity = data.quantity
        existing.category = data.category
        existing.updated_at = now
        if data.image_path:
            existing.image_path = data.image_path
        db.commit()
        return {"id": existing.id, "action": "updated"}

    item = models.InventoryItem(
        id=str(uuid.uuid4()),
        barcode=data.barcode,
        name=data.name,
        price=data.price,
        quantity=data.quantity,
        category=data.category,
        image_path=data.image_path,
        created_at=now,
        updated_at=now,
    )
    db.add(item)
    db.commit()
    return {"id": item.id, "action": "created"}

@app.delete("/api/inventory/{item_id}")
def delete_inventory(
    item_id: str,
    admin_pin: str = Query(...),
    current: models.Employee = Depends(auth.get_current_employee),
    db: Session = Depends(get_db),
):
    auth.verify_admin_pin_db(db, admin_pin)
    item = db.query(models.InventoryItem).filter(models.InventoryItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    db.delete(item)
    db.commit()
    return {"ok": True}

# ── SALES ─────────────────────────────────────────────────────────────────────
@app.get("/api/sales")
def list_sales(
    current: models.Employee = Depends(auth.get_current_employee),
    db: Session = Depends(get_db),
):
    rows = db.query(models.Sale).order_by(models.Sale.sold_at.desc()).all()
    return [{
        "id":           s.id,
        "item_id":      s.item_id,
        "barcode":      s.barcode,
        "item_name":    s.item_name,
        "price":        s.price,
        "quantity":     s.quantity,
        "sold_by":      s.sold_by,
        "sold_by_name": s.sold_by_name,
        "sold_at":      s.sold_at.isoformat() if s.sold_at else None,
    } for s in rows]

@app.post("/api/sales", status_code=201)
def record_sale(
    data: schemas.SaleCreate,
    current: models.Employee = Depends(auth.get_current_employee),
    db: Session = Depends(get_db),
):
    item = db.query(models.InventoryItem).filter(models.InventoryItem.id == data.item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    if item.quantity < data.quantity:
        raise HTTPException(status_code=400, detail="Insufficient stock")

    item.quantity -= data.quantity
    sale = models.Sale(
        id=str(uuid.uuid4()),
        item_id=item.id,
        barcode=item.barcode,
        item_name=item.name,
        price=item.price,
        quantity=data.quantity,
        sold_by=current.id,
        sold_by_name=current.name,
        sold_at=datetime.utcnow(),
    )
    db.add(sale)
    db.commit()
    return {"id": sale.id}

# ── RESET ─────────────────────────────────────────────────────────────────────
@app.post("/api/reset")
def full_reset(
    data: schemas.ResetRequest,
    current: models.Employee = Depends(auth.get_current_employee),
    db: Session = Depends(get_db),
):
    if current.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    if data.password != RESET_PASSWORD:
        raise HTTPException(status_code=403, detail="Invalid reset password")
    db.query(models.InventoryItem).delete()
    db.query(models.Sale).delete()
    db.commit()
    return {"ok": True}

# ── START ─────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn, socket
    try:
        local_ip = socket.gethostbyname(socket.gethostname())
    except Exception:
        local_ip = "YOUR-IP"
    print("\n" + "="*52)
    print("✅  Craftribe Inventory Tracker running!")
    print(f"📱  Local:    http://localhost:8000")
    print(f"📡  Network:  http://{local_ip}:8000")
    print(f"📖  API Docs: http://localhost:8000/docs")
    print("="*52 + "\n")
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
