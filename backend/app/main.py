from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import sets as sets_router
from app.routers import cards as cards_router

app = FastAPI(
    title="SWU Inventory Manager",
    description="Star Wars Unlimited card inventory management API",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(sets_router.router)
app.include_router(cards_router.router)


@app.get("/health")
def health_check():
    return {"status": "ok"}
