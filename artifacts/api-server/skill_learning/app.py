import asyncio
import logging
from contextlib import asynccontextmanager
from threading import BoundedSemaphore

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from .models import RecommendationInput, RecommendationsResponse, RoadmapInput, RoadmapResponse
from pydantic import BaseModel

log = logging.getLogger(__name__)
engine = None
status = "initializing"
capacity = BoundedSemaphore(2)


class ErrorResponse(BaseModel):
    error: str


ERRORS = {
    400: {"model": ErrorResponse, "description": "Invalid analysis input or options"},
    413: {"model": ErrorResponse, "description": "Request exceeds one megabyte"},
    503: {"model": ErrorResponse, "description": "Model/index initializing or service busy; see Retry-After"},
}


def initialize():
    global engine, status
    try:
        from .embeddings import EmbeddingService
        from .engine import RecommendationEngine
        from .repository import CourseRepository
        from .search import CourseSearchService
        courses = CourseRepository().load()
        search = CourseSearchService(courses, EmbeddingService())
        search.prepare()
        engine = RecommendationEngine(search)
        status = "ready"
        log.info("Skill Learning Recommendation Engine ready: %s public courses", len(courses))
    except Exception:
        status = "unavailable"
        # Do not log exceptions with database URLs, analysis fields or user identifiers.
        log.error("Learning engine initialization failed; verify catalog ingestion, model files and database connectivity.")


@asynccontextmanager
async def lifespan(app):
    task = asyncio.create_task(asyncio.to_thread(initialize))
    yield
    await task


app = FastAPI(
    title="Skill Learning Recommendation Engine", version="1.0.0",
    description="Consumes existing skill-analysis output. Local sentence-transformer embeddings, Chroma cosine search and a PostgreSQL public course catalog. No CV files or user analyses are retained.",
    docs_url="/api/learning/docs", redoc_url="/api/learning/redoc",
    openapi_url="/api/learning/openapi.json", lifespan=lifespan,
)


@app.exception_handler(RequestValidationError)
async def invalid_input(request, error):
    # FastAPI's default details include invalid input values. Never echo analysis payloads.
    return JSONResponse(status_code=400, content={"error": "Invalid analysis or options. Scores must be finite numbers from 0 to 100; see Swagger for limits."})

@app.exception_handler(HTTPException)
async def unavailable(request, error):
    return JSONResponse(status_code=error.status_code, content={"error": error.detail}, headers=error.headers)


@app.exception_handler(Exception)
async def unexpected_error(request, error):
    log.error("Learning request failed: %s", type(error).__name__)
    return JSONResponse(status_code=500, content={"error": "The learning request could not be completed."})


@app.middleware("http")
async def privacy_headers(request: Request, call_next):
    if request.method == "POST":
        content_length = request.headers.get("content-length")
        if content_length and (not content_length.isdigit() or int(content_length) > 1_048_576):
            return JSONResponse(status_code=413, content={"error": "Request body is too large."})
        body = await request.body()
        if len(body) > 1_048_576:
            return JSONResponse(status_code=413, content={"error": "Request body is too large."})
    response = await call_next(request)
    response.headers["Cache-Control"] = "no-store"
    return response


def ready_engine():
    if engine is None:
        raise HTTPException(status_code=503, detail="Learning engine is initializing or unavailable. Check /api/learning/healthz and retry.", headers={"Retry-After": "15"})
    return engine


@app.get("/api/learning/healthz")
def health():
    return {"status": status, "ready": engine is not None, "course_count": engine.dataset.record_count if engine else 0}


@app.post("/api/recommend-courses", response_model=RecommendationsResponse, responses=ERRORS, tags=["Learning recommendations"])
def recommend_courses(body: RecommendationInput):
    service = ready_engine()
    if not capacity.acquire(blocking=False):
        raise HTTPException(status_code=503, detail="Learning engine is busy; retry shortly.", headers={"Retry-After": "5"})
    try:
        return service.recommend(body.analysis, body.limit)
    finally:
        capacity.release()


@app.post("/api/learning-roadmap", response_model=RoadmapResponse, responses=ERRORS, tags=["Learning roadmap"])
def learning_roadmap(body: RoadmapInput):
    from .roadmap import RoadmapGenerator
    service = ready_engine()
    if not capacity.acquire(blocking=False):
        raise HTTPException(status_code=503, detail="Learning engine is busy; retry shortly.", headers={"Retry-After": "5"})
    try:
        return RoadmapGenerator(service).generate(body.analysis, body.courses_per_skill, body.hours_per_week)
    finally:
        capacity.release()


_default_openapi = app.openapi


def documented_openapi():
    schema = _default_openapi()
    for operations in schema.get("paths", {}).values():
        for operation in operations.values():
            if isinstance(operation, dict):
                operation.get("responses", {}).pop("422", None)
    return schema


app.openapi = documented_openapi
