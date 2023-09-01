#!/usr/bin/env bash

# Check if Gemfile exists (do nothing on gh-pages)
if [ -f Gemfile ]
then
  bundle exec middleman build
else
  mkdir build
  mv * build
fi
