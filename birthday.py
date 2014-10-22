#!/usr/bin/python
# -*- coding: utf-8 -*-

try:
  from xml.etree import ElementTree
except ImportError:
  from elementtree import ElementTree
from sets import Set

from datetime import datetime

import ConfigParser
import abc
import atom
import atom.service
import gdata.apps.groups.client
import gdata.service
import gdata.spreadsheet
import gdata.spreadsheet.service
import re
import string

class BirthdayCallback(object):
  __metaclass__ = abc.ABCMeta

  @abc.abstractmethod
  def start(self):
      """Start iterating values"""

  @abc.abstractmethod
  def end(self):
      """end iterating values"""

  @abc.abstractmethod
  def found_birthday(self, name, mokjang, dt):
    """
    Do something with birthday!
    dt: datetime object
    """

  @abc.abstractmethod
  def no_birthday(self, name, mokjang):
    """Found people without birthday field set."""

  @abc.abstractmethod
  def invalid_birthday(self, name, mokjang, date_string):
    """Error handling for invalid birthday."""

class NCBCTimothyAddressSpreadsheet:

  def __init__(self, email, password):
    self.gd_client = gdata.spreadsheet.service.SpreadsheetsService()
    self.gd_client.email = email
    self.gd_client.password = password
    self.gd_client.source = 'Spreadsheets GData Sample'
    self.gd_client.ProgrammaticLogin()
    self.list_feed = None
    self.answer_all = False

    config = ConfigParser.RawConfigParser()
    config.read('spreadsheet.cfg')
    self.spread_sheet_key = config.get('SaenuriYoung', 'spread_sheet_key')

  def CheckSpreadsheetAddress(self, birthday_callback):
    birthday_callback.start()

    feed = self.gd_client.GetWorksheetsFeed(self.spread_sheet_key)
    mokjang_re = re.compile('(.*)\(([a-z]+)\)')
    for i, entry in enumerate(feed.entry):
      mokjang_result = mokjang_re.match(entry.title.text)
      if mokjang_result:
        mokjang_name = mokjang_result.group(1).strip()
        print 'Checking birthday in ', mokjang_name

        id_parts = feed.entry[i].id.text.split('/')
        curr_wksht_id = id_parts[len(id_parts) - 1]
	list_feed = self.gd_client.GetListFeed(self.spread_sheet_key, curr_wksht_id)

        for i, entry in enumerate(list_feed.entry):
          name = entry.custom['name'].text.strip()
          utf8_name = name.encode('utf8')

          birthday_korean = unicode('생일', 'utf8')
          # Some spreadsheets like 'all' does not have a birthday column.
          if 'birthday' in entry.custom:
            birthday = entry.custom['birthday'].text
          elif birthday_korean in entry.custom:
            birthday = entry.custom[birthday_korean].text
          else:
            continue

          if not birthday:
            birthday_callback.no_birthday(name, mokjang_name)
            continue

          birthday = birthday.strip()

          # Parse date string to datetime.
          date_format = '%m/%d/%Y'
          try:
            d = datetime.strptime(birthday, date_format)
          except ValueError:
            birthday_callback.invalid_birthday(name, mokjang_name, birthday)
            continue

          birthday_callback.found_birthday(name, mokjang_name, d)

    birthday_callback.end()
