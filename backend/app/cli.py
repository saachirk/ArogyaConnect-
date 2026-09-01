"""CLI helpers: python -m app.cli init-db"""

import argparse

from app.database import init_db


def main() -> None:
    parser = argparse.ArgumentParser(description="ArogyaConnect database helpers")
    parser.add_argument("command", choices=["init-db"])
    args = parser.parse_args()
    if args.command == "init-db":
        init_db()
        print("Tables created.")


if __name__ == "__main__":
    main()
