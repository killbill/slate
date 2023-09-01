#!/usr/bin/env bash

# Check if Gemfile exists (do nothing on gh-pages)
if [ -f Gemfile ]
then
  bundle exec middleman build
else
  mkdir build
  mv fonts images javascripts stylesheets *.html build/
fi
