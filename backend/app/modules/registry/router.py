from datetime import UTC

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.db.deps import DbSession
from app.modules.observations.service import utc
from app.modules.registry.models import Astronaut, Device, Mission
from app.modules.registry.schemas import AstronautIn, AstronautOut, DeviceIn, DeviceOut, MissionIn, MissionOut

router = APIRouter(tags=["registry"])


def _created(model, row):  # type: ignore[no-untyped-def]
    out = model.model_validate(row)
    out.created_at = utc(out.created_at)
    for f in ("started_at",):
        if getattr(out, f, None) is not None:
            setattr(out, f, utc(getattr(out, f)))
    return out


def _insert(db: DbSession, row: object, model_id: str, kind: str) -> None:
    if db.get(type(row), model_id) is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, f"{kind} {model_id} already exists")
    db.add(row)
    db.commit()
    db.refresh(row)


@router.post("/astronauts", response_model=AstronautOut, status_code=201, summary="Register a pseudonymized astronaut")
def create_astronaut(body: AstronautIn, db: DbSession) -> AstronautOut:
    row = Astronaut(**body.model_dump())
    _insert(db, row, body.id, "astronaut")
    return _created(AstronautOut, row)


@router.get("/astronauts", response_model=list[AstronautOut])
def list_astronauts(db: DbSession) -> list[AstronautOut]:
    return [_created(AstronautOut, r) for r in db.scalars(select(Astronaut).order_by(Astronaut.id))]


@router.get("/astronauts/{astronaut_id}", response_model=AstronautOut)
def get_astronaut(astronaut_id: str, db: DbSession) -> AstronautOut:
    row = db.get(Astronaut, astronaut_id)
    if row is None:
        raise HTTPException(404, "astronaut not found")
    return _created(AstronautOut, row)


@router.post("/missions", response_model=MissionOut, status_code=201)
def create_mission(body: MissionIn, db: DbSession) -> MissionOut:
    data = body.model_dump()
    if data["started_at"] is not None:
        data["started_at"] = data["started_at"].astimezone(UTC)
    row = Mission(**data)
    _insert(db, row, body.id, "mission")
    return _created(MissionOut, row)


@router.get("/missions", response_model=list[MissionOut])
def list_missions(db: DbSession) -> list[MissionOut]:
    return [_created(MissionOut, r) for r in db.scalars(select(Mission).order_by(Mission.id))]


@router.post("/devices", response_model=DeviceOut, status_code=201)
def create_device(body: DeviceIn, db: DbSession) -> DeviceOut:
    if body.assigned_to and db.get(Astronaut, body.assigned_to) is None:
        raise HTTPException(422, f"unknown astronaut {body.assigned_to}")
    if body.mission_id and db.get(Mission, body.mission_id) is None:
        raise HTTPException(422, f"unknown mission {body.mission_id}")
    row = Device(**body.model_dump())
    _insert(db, row, body.id, "device")
    return _created(DeviceOut, row)


@router.get("/devices", response_model=list[DeviceOut])
def list_devices(db: DbSession, assigned_to: str | None = None) -> list[DeviceOut]:
    stmt = select(Device).order_by(Device.id)
    if assigned_to:
        stmt = stmt.where(Device.assigned_to == assigned_to)
    return [_created(DeviceOut, r) for r in db.scalars(stmt)]
