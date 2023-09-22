require 'nokogiri'

def toc_data(menu_items = [], current_item, page_content)
  # get a flat list of headers
  items = []

  updated_menu_items = menu_items.map do |item|
    headers = []
    Nokogiri::HTML::DocumentFragment.parse(partial("includes/#{item}")).css('h1, h2, h3').each do |header|
      headers << {
        id: header['id'],
        content: header.text,
        title: header.text.gsub(/<[^>]*>/, ''),
        level: header.name[1].to_i,
        children: [],
        href: item == current_item ? "##{header['id']}" : "#{item}.html"
      }
    end

    [3, 2].each do |header_level|
      header_to_nest = nil
      headers.reject! do |header|
        if header[:level] == header_level
          (header_to_nest ||= {})[:children] << header
          true
        else
          header_to_nest = header if header[:level] < header_level
          false
        end
      end
    end

    headers.first
  end

  updated_menu_items
end