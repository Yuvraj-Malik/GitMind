function CitationLink({ filePath, line }) {
  return (
    <a href="#" className="citation-link">
      {filePath}:{line}
    </a>
  );
}

export default CitationLink;
