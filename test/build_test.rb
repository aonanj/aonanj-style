# frozen_string_literal: true

require "bundler/setup"
require "minitest/autorun"
require "jekyll"
require "jekyll-remote-theme"
require "jekyll-github-metadata"
require "jekyll-readme-index"
require "jekyll-optional-front-matter"
require "jekyll-relative-links"
require "nokogiri"
require "fileutils"
require "tmpdir"
require "base64"

THEME_ROOT = File.expand_path("..", __dir__)

# Exercise the real remote-theme extraction and loading path, offline. Only the
# HTTP download is replaced; no layouts/assets are copied into the consumer.
module LocalThemeDownload
  def download
    Zip::OutputStream.open(zip_file.path) do |archive|
      archive.put_next_entry("aonanj-style-main/")
      files = %w[_layouts _includes assets _config.yml] +
              Dir.glob("{_layouts,_includes,assets}/**/*", base: THEME_ROOT)
      files.sort.each do |relative|
        source = File.join(THEME_ROOT, relative)
        directory = File.directory?(source)
        archive.put_next_entry("aonanj-style-main/#{relative}#{directory ? '/' : ''}")
        archive.write(File.binread(source)) unless directory
      end
    end
    @downloaded = true
  end
end
Jekyll::RemoteTheme::Downloader.prepend(LocalThemeDownload)

# A test should never wait for or depend on live profile/repository requests.
module OfflineMetadata
  def internet_connected?
    false
  end
end
Jekyll::GitHubMetadata::Client.prepend(OfflineMetadata)

class ThemeBuildTest < Minitest::Test
  def setup
    FileUtils.mkdir_p(File.join(THEME_ROOT, ".test-output"))
    @workdir = Dir.mktmpdir("consumer-", File.join(THEME_ROOT, ".test-output"))
    @source = File.join(@workdir, "source")
    @destination = File.join(@workdir, "site")
    FileUtils.mkdir_p(@source)
    write("README.md", File.read(File.join(__dir__, "fixtures/README.md")))
    quickstart = File.read(File.join(THEME_ROOT, "README.md"))[/```yaml\n(.*?)```/m, 1]
    @config = YAML.safe_load(quickstart).merge({
      "source" => @source, "destination" => @destination,
      "safe" => true, "quiet" => true, "strict_front_matter" => true,
      "remote_theme" => "aonanj/aonanj-style@main", "repository" => "sample-owner/project",
      "url" => "https://example.test", "baseurl" => "/project",
      "title" => "Consumer fallback", "description" => "Consumer description fallback",
      "markdown" => "kramdown", "kramdown" => { "input" => "GFM" },
      "github" => {
        "repository_name" => "project", "repository_url" => "https://github.com/sample-owner/project",
        "project_tagline" => "Small tools. Thoughtful documentation.", "private" => false,
        "owner_name" => "sample-owner", "owner_display_name" => "Sample Owner",
        "owner_url" => "https://github.com/sample-owner", "hostname" => "github.com",
        "owner" => { "name" => "Sample Owner", "email" => "owner@example.test" }
      }
    })
  end

  def teardown
    FileUtils.remove_entry(@workdir)
  end

  def write(relative, text)
    target = File.join(@source, relative)
    FileUtils.mkdir_p(File.dirname(target))
    File.binwrite(target, text)
  end

  def build
    File.write(File.join(@source, "_config.yml"), @config.to_yaml)
    Jekyll::Site.new(Jekyll.configuration(@config)).process
    Nokogiri::HTML(File.read(File.join(@destination, "index.html")))
  end

  def test_public_consumer_loads_remote_assets_and_renders_readme
    # A valid PNG for the optional browser preview; JPEG presence tests precedence.
    write("public/icon-64x64.png", Base64.decode64("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="))
    write("public/icon-64x64.jpg", "fixture")
    write("public/favicon.ico", "fixture")
    write("LICENSE.md", "# MIT License\n\nLicense fixture.")
    doc = build
    assert_equal 3, doc.css(".site-shell > .card").size
    assert_equal "project", doc.at_css(".repo-name").text
    assert_equal "Small tools. Thoughtful documentation.", doc.at_css(".repo-description em").text
    assert_equal "https://github.com/sample-owner/project", doc.at_css(".repo-link")["href"]
    assert_equal "/project/public/icon-64x64.png", doc.at_css(".repo-icon")["src"]
    assert_equal "64", doc.at_css(".repo-icon")["width"]
    assert_equal "/project/public/favicon.ico", doc.at_css('link[rel="icon"]')["href"]
    assert_equal "Sample Owner", doc.at_css(".owner-name").text
    assert doc.at_css('a[href="mailto:owner@example.test"]')
    assert_equal "/project/LICENSE.md", doc.at_css(".license-link")["href"]
    assert File.file?(File.join(@destination, "LICENSE.md"))
    assert_equal "Field notes", doc.at_css(".readme > h1").text
    assert_equal 4, doc.css(".readme tbody tr").size
    assert doc.at_css("#table-of-contents"), "The non-JavaScript fallback must keep the TOC"
    assert doc.at_css('link[href="/project/assets/css/aonanj-style.css"]')
    assert doc.at_css('script[src="/project/assets/js/aonanj-style.js"]')
    assert File.file?(File.join(@destination, "assets/css/aonanj-style.css"))
    assert File.file?(File.join(@destination, "assets/js/aonanj-style.js"))
    refute File.exist?(File.join(@destination, "README.md"))
    refute_includes doc.at_css(".repo-heading").text, "aonanj-style"
    assert doc.at_css('.theme-credit a[href="https://www.phaethonorder.com"]')
    assert doc.at_css('.theme-credit a[href="https://github.com/aonanj/aonanj-style"]')
    if ENV["THEME_PREVIEW"] == "1"
      preview = File.join(THEME_ROOT, ".test-output/preview/project")
      FileUtils.mkdir_p(preview)
      FileUtils.cp_r("#{@destination}/.", preview)
    end
  end

  def test_private_consumer_omits_source_link_and_absent_assets
    @config["github"]["private"] = true
    @config["github"]["owner"]["email"] = nil
    doc = build
    refute doc.at_css(".repo-link")
    refute doc.at_css(".repo-icon")
    refute doc.at_css('link[rel="icon"]')
    refute doc.at_css(".license-link")
    refute doc.at_css('a[href^="mailto:"]')
  end

  def test_unknown_visibility_does_not_imply_public
    @config["github"]["private"] = nil
    doc = build
    refute doc.at_css(".repo-link")
  end

  def test_explicit_public_override_and_root_site
    @config["github"]["private"] = nil
    @config["baseurl"] = ""
    @config["aonanj_style"] = {
      "repository_name" => "A & B <project>", "description" => "Tools & <examples>",
      "repository_public" => true, "favicon" => "/icons/custom.ico",
      "owner" => { "name" => "Another Owner", "username" => "another", "email" => false },
      "license_url" => "https://example.org/terms"
    }
    write("icons/custom.ico", "fixture")
    doc = build
    assert doc.at_css(".repo-link")
    assert_equal "A & B <project>", doc.at_css(".repo-name").text
    refute doc.at_css(".repo-name project")
    assert_equal "Tools & <examples>", doc.at_css(".repo-description").text
    assert_equal "/icons/custom.ico", doc.at_css('link[rel="icon"]')["href"]
    assert doc.at_css('link[href="/assets/css/aonanj-style.css"]')
    assert doc.at_css('a[href="https://github.com/another"]')
    refute doc.at_css('a[href^="mailto:"]')
    assert_equal "https://example.org/terms", doc.at_css(".license-link")["href"]
  end

  def test_known_private_metadata_wins_over_public_override
    @config["github"]["private"] = true
    @config["aonanj_style"] = { "repository_public" => true }
    refute build.at_css(".repo-link")
  end

  def test_false_overrides_are_not_lost_to_liquid_defaults
    write("favicon.ico", "fixture")
    @config["aonanj_style"] = { "repository_public" => false, "favicon" => false, "owner" => { "email" => false } }
    doc = build
    refute doc.at_css(".repo-link")
    refute doc.at_css('link[rel="icon"]')
    refute doc.at_css('a[href^="mailto:"]')
  end

  def test_jpg_root_favicon_and_frontmatter_readme
    write("public/icon-64x64.jpg", "fixture")
    write("favicon.ico", "fixture")
    write("README.md", "---\nlayout: home\n---\n# Front matter README\n")
    doc = build
    assert_equal "/project/public/icon-64x64.jpg", doc.at_css(".repo-icon")["src"]
    assert_equal "/project/favicon.ico", doc.at_css('link[rel="icon"]')["href"]
    assert_equal "Front matter README", doc.at_css(".readme h1").text
  end

  def test_consumer_custom_head_and_markdown_links
    write("_includes/aonanj-style/custom-head.html", '<meta name="consumer-test" content="overridden">')
    write("guide.md", "---\nlayout: page\n---\n# Guide\n")
    write("README.md", "# Home\n\n[Guide](guide.md)\n")
    doc = build
    assert doc.at_css('meta[name="consumer-test"][content="overridden"]')
    assert doc.at_css('.readme a[href="/project/guide.html"]')
    guide = Nokogiri::HTML(File.read(File.join(@destination, "guide.html")))
    assert_equal "Guide", guide.at_css(".readme h1").text
  end

  def test_license_with_frontmatter_links_to_rendered_page
    write("LICENSE.md", "---\nlayout: page\ntitle: License\n---\n# MIT License\n")
    doc = build
    assert_equal "/project/LICENSE.html", doc.at_css(".license-link")["href"]
    license = Nokogiri::HTML(File.read(File.join(@destination, "LICENSE.html")))
    assert_equal "MIT License", license.at_css(".readme h1").text
  end

  def test_complete_theme_readme_builds_without_liquid_damage
    write("README.md", File.read(File.join(THEME_ROOT, "README.md")))
    write("LICENSE.md", File.read(File.join(THEME_ROOT, "LICENSE.md")))
    doc = build
    assert_includes doc.text, '${{ secrets.GITHUB_TOKEN }}'
    assert_includes doc.text, "{{ '/assets/css/custom.css' | relative_url }}"
    assert_equal 9, doc.css("#table-of-contents + ul > li").size
    refute_includes doc.to_html, "Liquid Exception"
  end
end
