"""Explicit public catalog data import. Does not create schema or change production schema."""
import argparse
import logging


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--index", action="store_true", help="Also build the derived Chroma embedding index")
    options = parser.parse_args()
    logging.basicConfig(level=logging.INFO)
    from .repository import CourseRepository
    repository = CourseRepository()
    count = repository.ingest()
    logging.info("Ingested %s public course records", count)
    if options.index:
        from .embeddings import EmbeddingService
        from .search import CourseSearchService
        CourseSearchService(repository.load(), EmbeddingService()).prepare()


if __name__ == "__main__":
    main()
