from sqlalchemy.orm import Session
from backend.models.database_models import SystemSetting


class SettingsService:
    @staticmethod
    def get(db: Session, key: str, default: str = "") -> str:
        row = db.query(SystemSetting).filter(SystemSetting.key == key).first()
        return row.value if row and row.value is not None else default

    @staticmethod
    def render(template: str, **values) -> str:
        result = template
        for key, value in values.items():
            result = result.replace("{" + key + "}", str(value or ""))
        return result
