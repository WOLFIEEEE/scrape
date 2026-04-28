from scrape.extractors.markdown import extract_metadata, extract_title, html_to_markdown
from scrape.extractors.selectors import find_extractor


def test_html_to_markdown_basic_headings_and_paragraphs():
    html = """
    <html><head></head><body>
      <h1>Hello</h1>
      <p>This is a paragraph.</p>
      <ul><li>One</li><li>Two</li></ul>
      <a href="/about">About us</a>
    </body></html>
    """
    md = html_to_markdown(html, base_url="https://example.com")
    assert "# Hello" in md
    assert "This is a paragraph." in md
    assert "- One" in md and "- Two" in md
    assert "[About us](https://example.com/about)" in md


def test_html_to_markdown_drops_scripts():
    html = "<html><body><p>keep</p><script>drop me</script></body></html>"
    md = html_to_markdown(html)
    assert "drop me" not in md
    assert "keep" in md


def test_extract_title_and_metadata():
    html = """
    <html><head>
      <title>My Title</title>
      <meta name="description" content="my desc">
      <meta property="og:image" content="https://x/y.png">
    </head><body></body></html>
    """
    assert extract_title(html) == "My Title"
    meta = extract_metadata(html)
    assert meta["description"] == "my desc"
    assert meta["og:image"] == "https://x/y.png"


def test_books_selector_extracts_known_fields():
    """Run the bundled per-site selector against a representative HTML stub."""
    html = """
    <html><body>
      <div class="product_main">
        <h1>A Light in the Attic</h1>
        <p class="price_color">£51.77</p>
        <p class="availability">In stock</p>
      </div>
      <div id="product_description"></div>
      <p>Description text here.</p>
    </body></html>
    """
    fn = find_extractor("books.toscrape.com")
    assert fn is not None
    data = fn(html, "https://books.toscrape.com/x")
    assert data["title"] == "A Light in the Attic"
    assert data["price"] == "£51.77"
    assert data["availability"] == "In stock"
    assert data["description"] == "Description text here."
