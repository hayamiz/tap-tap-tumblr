#!/usr/bin/env ruby

require 'rubygems'
require 'cgi'
require 'net/http'
require 'uri'
require 'hpricot'
require 'time'
require 'json'
require 'fileutils'
require 'webrick'

load './credentials.rb'

class Tumblr
  def initialize(email, password, host = nil)
    Net::HTTP.version_1_2
    @email = email
    @password = password
    
    refresh_cookie()
  end

  def refresh_cookie(force = false)
    @cookie_data = nil
    while @cookie_data == nil
      cookie_data_path = "./.cookie_#{@email}"
      if force
        FileUtils.remove(cookie_data_path)
      end
      cookie_data = nil
      if File.exists?(cookie_data_path)
        cookie_data = Marshal.load(File.open(cookie_data_path))
        unless cookie_data.is_a?(Hash) || (cookie_data[:expires] && cookie_data[:expires] < Time.now)
          cookie_data = nil
        end
      end

      unless cookie_data
        res = call_api(:post, "www.tumblr.com", "/login",
                       {:email => @email, :password => @password})
        cookies = res["set-cookie"].split("httponly,")
        raise RuntimeError.new("login failed") if cookies.size < 2
        cookies = cookies.select{|str| ! (str =~ /tmgioct/)}
        cookies = cookies.map{|str| str.strip.split(";").map(&:strip)}
        values = Hash.new
        expires = Time.parse(cookies[0][1].split("=")[1])
        cookies.each do |cookie_entry|
          k,v = cookie_entry[0].split("=")
          values[k] = v
        end

        cookie_data = Hash.new
        cookie_data[:expires] = expires
        cookie_data[:values] = values
        File.open(cookie_data_path, "w") do |file|
          file.print(Marshal.dump(cookie_data))
        end
      end
      @cookie_data = cookie_data
    end
  end

  def dashboard(options = {})
    res = call_api(:get, "www.tumblr.com", "/iphone", options)
    if res
      convert_dashboard_page(res.body).to_json
    else
      refresh_cookie(true)
    end
  end

  def convert_dashboard_page(html_str)
    doc = Hpricot(html_str)
    posts = doc.search("//ol[@id='posts']/li").select{|post| post[:id] =~ /post_(\d+)/}
    post_controls = doc.search("//ol[@id='posts']/li").select{|post| post[:id] =~ /post_controls_(\d+)/}
    posts = posts.zip(post_controls).map{|args|
      post = args[0]
      post_control = args[1]

      ret = Hash.new
      post[:id] =~ /post_(\d+)/
      ret[:id] = $~[1]
      reblog_path = post_control.search('button').select{|btn|
        btn[:onclick] =~ /reblog/
      }[0]
      if reblog_path
        reblog_path = reblog_path[:onclick].gsub(/\Alocation\.href='([^']+)';/, "\\1")
        reblog_path =~ /\/reblog\/\d+\/([^?]+)/
        ret[:reblog_key] = $~[1]
      end

      user = post.search("div.meta > div > a")[0].innerHTML
      ret[:user] = user
      ret[:permalink] = post.search("div.meta > div > a")[0][:href]

      post = post.search(".post")[0]
      case post[:class].split[1]
      when /\Aphoto_post\Z/
        ret[:type] = "photo"
        photo_url_small = post.search("img")[0][:src]
        photo_url_large = if post.search("a")[0][:onclick] =~ URI.regexp
                            $~[0].gsub(/["']+$/, "")
                          else
                            photo_url_small
                          end
        ret[:photo_url] = photo_url_small
        ret[:photo_url_small] = photo_url_small
        ret[:photo_url_large] = photo_url_large
        if post.search(".caption").empty?
          caption = ""
        else
          caption = post.search(".caption")[0].innerHTML
        end
        ret[:content] = "<div class=\"photo-caption\">#{caption}</div>"
      when /\Aquote_post\Z/
        ret[:type] = "quote"
        text = post.search("div.quote").innerHTML
        source = post.search(".source").innerHTML
        ret[:content] = <<EOS
<div class="quote-text">#{text}</div>
<div class="quote-source">#{source}</div>
EOS
      when /\Atext_post\Z/
        ret[:type] = "text"
        ret[:content] = post.innerHTML
      when /\Avideo_post\Z/
        ret[:type] = "video"
        ret[:content] = post.innerHTML
      when /\Achat_post\Z/
        ret[:type] = "chat"
        ret[:content] = post.innerHTML
      when /\Alink_post\Z/
        ret[:type] = "link"
        ret[:content] = post.innerHTML
      else
        ret = nil
      end
      ret
    }.compact
  end

  def reblog(id, reblog_key)
    res = call_api(:post, "www.tumblr.com", "/api/reblog",
                   {"email" => @email, "password" => @password,
                     "post-id" => id, "reblog-key" => reblog_key})
    if res
      res.body
    else
      refresh_cookie(true)
      nil
    end
  end

  def call_api(method, host, path, params = nil)
    retry_num = 5
    while retry_num > 0
      req = nil
      if method == :get
        req = Net::HTTP::Get.new(path)
      elsif method == :post
        req = Net::HTTP::Post.new(path)
      else
        return nil
      end

      if params
        if method == :get
          query_string = params.map{|k,v|
            URI.encode(k.to_s) + "=" + URI.encode(v.to_s)
          }.join("&")
          req = Net::HTTP::Get.new(path + "?" + query_string)
        elsif method == :post
          req.set_form_data(params)
          req["content-type"] = "application/x-www-form-urlencoded"
        end
      end
      if @cookie_data
        req["cookie"] = @cookie_data[:values].map{|k,v| "#{k}=#{v}"}.join("; ")
      end
      res = Net::HTTP.start(host, 80) {|http|
        response = http.request(req)
        response
      }
      if res.code == "200" || res.code == "201"
        return res
      end
      retry_num -= 1
    end
    nil
  end
end

def main(argv)
  res = case $cgi.params["method"][0]
        when /\Adashboard\Z/
          tumblr = Tumblr.new($email, $password)
          params = Hash.new
          params[:offset] = $cgi.params["offset"][0] if $cgi.params["offset"]
          params[:page] = $cgi.params["page"][0] if $cgi.params["page"]
          tumblr.dashboard(params)
        when /\Areblog\Z/
          if $cgi.params["reblog_key"] && $cgi.params["id"]
            reblog_key = $cgi.params["reblog_key"][0]
            id = $cgi.params["id"][0]
            _pwd = Dir.pwd
            Process.fork{
              WEBrick::Daemon.start
              Dir.chdir(_pwd)
              tumblr = Tumblr.new($email, $password)
              50.times do
                begin
                  if tumblr.reblog(id, reblog_key)
                    break
                  end
                rescue Timeout::Error => err
                end
              end
            }
            "true"
          else
            nil
          end
        when /\Asleep\Z/
          sleep(10)
          "sleep"
        end
  res ||= "null"

  $cgi.out("application/json") do
    res
  end
end

if __FILE__ == $0
  $cgi = CGI.new
  main(ARGV.dup)
end
