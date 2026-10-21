import logging
import os

import uvicorn

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    uvicorn.run("skill_learning.app:app", host="0.0.0.0", port=int(os.environ["PORT"]), access_log=False)
