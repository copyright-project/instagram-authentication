#!/usr/bin/env bash

heroku container:push web -a media-registry
heroku container:release web -a media-registry