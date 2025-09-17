from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timedelta
import jwt
from passlib.context import CryptContext
import pandas as pd
import io
from bson import ObjectId
import json

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client.get_database("mantenimiento_equipos")

# Security
SECRET_KEY = os.environ.get('SECRET_KEY', 'your-secret-key-change-this')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

# Create the main app without a prefix
app = FastAPI(title="Sistema de Mantenimiento de Equipos", version="1.0.0")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Models
class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    email: str
    full_name: str
    role: str = "user"  # "admin" or "user"
    is_active: bool = True
    must_change_password: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_login: Optional[datetime] = None

class UserCreate(BaseModel):
    username: str
    email: str
    password: str
    full_name: str
    role: str = "user"

class UserCreateByAdmin(BaseModel):
    username: str
    email: str
    full_name: str
    role: str
    temporary_password: str

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    is_active: Optional[bool] = None
    role: Optional[str] = None

class PasswordChange(BaseModel):
    current_password: str
    new_password: str

class PasswordReset(BaseModel):
    new_password: str

class UserLogin(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user: Dict[str, Any]

class Equipment(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    area: str
    equipment_type: str  # "cpu", "monitor", "impresora"
    nombre_pc: Optional[str] = None
    marca: str
    modelo: str
    serie: str
    fecha: datetime
    tipo_mantenimiento: str  # "preventivo", "correctivo", "limpieza"
    observaciones: str
    tecnico_responsable: str
    estado_equipo: str = "operativo"  # "operativo", "en_reparacion", "fuera_servicio"
    created_by: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None
    updated_by: Optional[str] = None

class EquipmentCreate(BaseModel):
    area: str
    equipment_type: str
    nombre_pc: Optional[str] = None
    marca: str
    modelo: str
    serie: str
    fecha: datetime
    tipo_mantenimiento: str
    observaciones: str
    estado_equipo: str = "operativo"

class EquipmentUpdate(BaseModel):
    area: Optional[str] = None
    nombre_pc: Optional[str] = None
    marca: Optional[str] = None
    modelo: Optional[str] = None
    serie: Optional[str] = None
    fecha: Optional[datetime] = None
    tipo_mantenimiento: Optional[str] = None
    observaciones: Optional[str] = None
    estado_equipo: Optional[str] = None

class EquipmentFilter(BaseModel):
    equipment_type: Optional[str] = None
    area: Optional[str] = None
    tipo_mantenimiento: Optional[str] = None
    estado_equipo: Optional[str] = None
    fecha_inicio: Optional[datetime] = None
    fecha_fin: Optional[datetime] = None
    search: Optional[str] = None

class DashboardStats(BaseModel):
    total_equipments: int
    equipments_by_type: Dict[str, int]
    equipments_by_status: Dict[str, int]
    maintenance_by_type: Dict[str, int]
    recent_maintenances: List[Dict]

# Utility functions
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except jwt.PyJWTError:
        raise credentials_exception
    
    user = await db.users.find_one({"username": username})
    if user is None:
        raise credentials_exception
    
    # Convert ObjectId to string and remove _id
    user_data = {k: (str(v) if isinstance(v, ObjectId) else v) for k, v in user.items() if k != "password"}
    if "_id" in user_data:
        del user_data["_id"]
    
    return User(**user_data)

async def get_admin_user(current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    return current_user

# Routes
@api_router.post("/register", response_model=User)
async def register_user(user: UserCreate):
    # Only allow normal user registration
    if user.role != "user":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only normal users can be registered through this endpoint"
        )
    
    # Check if user exists
    existing_user = await db.users.find_one({"$or": [{"username": user.username}, {"email": user.email}]})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username or email already registered"
        )
    
    # Hash password
    hashed_password = get_password_hash(user.password)
    
    # Create user
    user_data = user.dict()
    user_data["password"] = hashed_password
    user_obj = User(**{k: v for k, v in user_data.items() if k != "password"})
    
    # Insert in database
    await db.users.insert_one({**user_obj.dict(), "password": hashed_password})
    return user_obj

@api_router.post("/login", response_model=Token)
async def login_user(user_credentials: UserLogin):
    user = await db.users.find_one({"username": user_credentials.username})
    if not user or not verify_password(user_credentials.password, user["password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user["username"]}, expires_delta=access_token_expires
    )
    
    # Convert ObjectId to string and remove password
    user_data = {k: (str(v) if isinstance(v, ObjectId) else v) for k, v in user.items() if k != "password"}
    if "_id" in user_data:
        del user_data["_id"]
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user_data
    }

@api_router.get("/me", response_model=User)
async def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user

@api_router.post("/equipment", response_model=Equipment)
async def create_equipment(equipment: EquipmentCreate, current_user: User = Depends(get_current_user)):
    equipment_data = equipment.dict()
    equipment_data["created_by"] = current_user.username
    equipment_data["tecnico_responsable"] = current_user.full_name
    
    equipment_obj = Equipment(**equipment_data)
    await db.equipment.insert_one(equipment_obj.dict())
    return equipment_obj

@api_router.get("/equipment", response_model=List[Equipment])
async def get_equipment(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user)
):
    equipment_list = await db.equipment.find().skip(skip).limit(limit).sort("created_at", -1).to_list(1000)
    # Convert ObjectId to string and remove _id
    cleaned_equipment = []
    for equipment in equipment_list:
        equipment_data = {k: (str(v) if isinstance(v, ObjectId) else v) for k, v in equipment.items()}
        if "_id" in equipment_data:
            del equipment_data["_id"]
        cleaned_equipment.append(Equipment(**equipment_data))
    return cleaned_equipment

@api_router.post("/equipment/filter", response_model=List[Equipment])
async def filter_equipment(
    filters: EquipmentFilter,
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user)
):
    query = {}
    
    if filters.equipment_type:
        query["equipment_type"] = filters.equipment_type
    if filters.area:
        query["area"] = {"$regex": filters.area, "$options": "i"}
    if filters.tipo_mantenimiento:
        query["tipo_mantenimiento"] = filters.tipo_mantenimiento
    if filters.estado_equipo:
        query["estado_equipo"] = filters.estado_equipo
    if filters.fecha_inicio and filters.fecha_fin:
        query["fecha"] = {"$gte": filters.fecha_inicio, "$lte": filters.fecha_fin}
    if filters.search:
        query["$or"] = [
            {"marca": {"$regex": filters.search, "$options": "i"}},
            {"modelo": {"$regex": filters.search, "$options": "i"}},
            {"serie": {"$regex": filters.search, "$options": "i"}},
            {"observaciones": {"$regex": filters.search, "$options": "i"}}
        ]
    
    equipment_list = await db.equipment.find(query).skip(skip).limit(limit).sort("created_at", -1).to_list(1000)
    # Convert ObjectId to string and remove _id
    cleaned_equipment = []
    for equipment in equipment_list:
        equipment_data = {k: (str(v) if isinstance(v, ObjectId) else v) for k, v in equipment.items()}
        if "_id" in equipment_data:
            del equipment_data["_id"]
        cleaned_equipment.append(Equipment(**equipment_data))
    return cleaned_equipment

@api_router.put("/equipment/{equipment_id}", response_model=Equipment)
async def update_equipment(
    equipment_id: str,
    equipment_update: EquipmentUpdate,
    current_user: User = Depends(get_admin_user)
):
    equipment = await db.equipment.find_one({"id": equipment_id})
    if not equipment:
        raise HTTPException(status_code=404, detail="Equipment not found")
    
    update_data = {k: v for k, v in equipment_update.dict().items() if v is not None}
    update_data["updated_at"] = datetime.utcnow()
    update_data["updated_by"] = current_user.username
    
    await db.equipment.update_one({"id": equipment_id}, {"$set": update_data})
    
    updated_equipment = await db.equipment.find_one({"id": equipment_id})
    # Convert ObjectId to string and remove _id
    equipment_data = {k: (str(v) if isinstance(v, ObjectId) else v) for k, v in updated_equipment.items()}
    if "_id" in equipment_data:
        del equipment_data["_id"]
    return Equipment(**equipment_data)

@api_router.delete("/equipment/{equipment_id}")
async def delete_equipment(
    equipment_id: str,
    current_user: User = Depends(get_admin_user)
):
    result = await db.equipment.delete_one({"id": equipment_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Equipment not found")
    return {"message": "Equipment deleted successfully"}

@api_router.get("/dashboard", response_model=DashboardStats)
async def get_dashboard_stats(current_user: User = Depends(get_current_user)):
    # Total equipments
    total_equipments = await db.equipment.count_documents({})
    
    # Equipment by type
    pipeline_type = [
        {"$group": {"_id": "$equipment_type", "count": {"$sum": 1}}}
    ]
    type_results = await db.equipment.aggregate(pipeline_type).to_list(100)
    equipments_by_type = {item["_id"]: item["count"] for item in type_results}
    
    # Equipment by status
    pipeline_status = [
        {"$group": {"_id": "$estado_equipo", "count": {"$sum": 1}}}
    ]
    status_results = await db.equipment.aggregate(pipeline_status).to_list(100)
    equipments_by_status = {item["_id"]: item["count"] for item in status_results}
    
    # Maintenance by type
    pipeline_maintenance = [
        {"$group": {"_id": "$tipo_mantenimiento", "count": {"$sum": 1}}}
    ]
    maintenance_results = await db.equipment.aggregate(pipeline_maintenance).to_list(100)
    maintenance_by_type = {item["_id"]: item["count"] for item in maintenance_results}
    
    # Recent maintenances
    recent_maintenances = await db.equipment.find().sort("created_at", -1).limit(5).to_list(5)
    recent_maintenances = [
        {
            "id": item["id"],
            "equipment_type": item["equipment_type"],
            "marca": item["marca"],
            "modelo": item["modelo"],
            "tipo_mantenimiento": item["tipo_mantenimiento"],
            "fecha": item["fecha"],
            "tecnico_responsable": item["tecnico_responsable"]
        }
        for item in recent_maintenances
    ]
    
    return DashboardStats(
        total_equipments=total_equipments,
        equipments_by_type=equipments_by_type,
        equipments_by_status=equipments_by_status,
        maintenance_by_type=maintenance_by_type,
        recent_maintenances=recent_maintenances
    )

@api_router.post("/export/excel")
async def export_to_excel(
    filters: EquipmentFilter,
    current_user: User = Depends(get_current_user)
):
    query = {}
    
    if filters.equipment_type:
        query["equipment_type"] = filters.equipment_type
    if filters.area:
        query["area"] = {"$regex": filters.area, "$options": "i"}
    if filters.tipo_mantenimiento:
        query["tipo_mantenimiento"] = filters.tipo_mantenimiento
    if filters.estado_equipo:
        query["estado_equipo"] = filters.estado_equipo
    if filters.fecha_inicio and filters.fecha_fin:
        query["fecha"] = {"$gte": filters.fecha_inicio, "$lte": filters.fecha_fin}
    if filters.search:
        query["$or"] = [
            {"marca": {"$regex": filters.search, "$options": "i"}},
            {"modelo": {"$regex": filters.search, "$options": "i"}},
            {"serie": {"$regex": filters.search, "$options": "i"}},
            {"observaciones": {"$regex": filters.search, "$options": "i"}}
        ]
    
    equipment_list = await db.equipment.find(query).sort("created_at", -1).to_list(10000)
    
    # Convert to DataFrame
    df_data = []
    for equipment in equipment_list:
        df_data.append({
            "ID": equipment["id"],
            "Área": equipment["area"],
            "Tipo de Equipo": equipment["equipment_type"],
            "Nombre PC": equipment.get("nombre_pc", ""),
            "Marca": equipment["marca"],
            "Modelo": equipment["modelo"],
            "Serie": equipment["serie"],
            "Fecha Mantenimiento": equipment["fecha"].strftime("%Y-%m-%d"),
            "Tipo Mantenimiento": equipment["tipo_mantenimiento"],
            "Estado Equipo": equipment["estado_equipo"],
            "Observaciones": equipment["observaciones"],
            "Técnico Responsable": equipment["tecnico_responsable"],
            "Creado por": equipment["created_by"],
            "Fecha Creación": equipment["created_at"].strftime("%Y-%m-%d %H:%M:%S")
        })
    
    df = pd.DataFrame(df_data)
    
    # Create Excel file in memory
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, sheet_name='Mantenimiento Equipos', index=False)
    
    output.seek(0)
    
    # Return Excel file
    return StreamingResponse(
        io.BytesIO(output.read()),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": "attachment; filename=reporte_mantenimiento.xlsx",
            "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        }
    )

# Initialize admin user if not exists
@app.on_event("startup")
async def create_admin_user():
    admin_user = await db.users.find_one({"username": "admin"})
    if not admin_user:
        admin_data = {
            "id": str(uuid.uuid4()),
            "username": "admin",
            "email": "admin@mantenimiento.com",
            "full_name": "Administrador del Sistema",
            "role": "admin",
            "is_active": True,
            "created_at": datetime.utcnow(),
            "password": get_password_hash("admin123")  # Change this password!
        }
        await db.users.insert_one(admin_data)
        logging.info("Admin user created with username: admin, password: admin123")

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()