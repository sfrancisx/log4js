/*
Copyright (c) 2012, Yahoo! Inc.  All rights reserved.

Redistribution and use of this software in source and binary forms, 
with or without modification, are permitted provided that the following 
conditions are met:

* Redistributions of source code must retain the above
  copyright notice, this list of conditions and the
  following disclaimer.

* Redistributions in binary form must reproduce the above
  copyright notice, this list of conditions and the
  following disclaimer in the documentation and/or other
  materials provided with the distribution.

* Neither the name of Yahoo! Inc. nor the names of its
  contributors may be used to endorse or promote products
  derived from this software without specific prior
  written permission of Yahoo! Inc.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS 
IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED 
TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A 
PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT 
OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, 
SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT 
LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, 
DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY 
THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT 
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE 
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

/**
* A very simple, lightweight JavaScript logging framework, modeled (very loosely) after log4j.  
* "Lightweight" means the compressed code is around 1K.<br />
*
* The main participants are:<br />
* - Loggers: offer a simple logging API.<br />
*   Loggers of a given name are singletons i.e. when you request a Logger by its
*   name, a new one is created for you only if one doesn't already exist. You'd
*   create a logger suitable for your needs and customize it if necessary. You can then
*   use that logger, without concern of interference with other loggers that are likely
*   configured differently.<br />
*
* - Appenders: append/write log entries to their respective media e.g. local file, console,
*   file on the server, etc. There could be more than one appender per logger, in which case
*   they will all log.<hr />
*
* Custom appenders can be created.  An appender is required to implement a single function:
* notify(entry), where entry is an object containing 'msg' (a string) and 'id' (a number).
* Appenders can implement an optional refresh() method.  refresh() will be called when an
* appender is first attached to a logger, allowing the appender to show previously logged
* messages.
* <hr /><b>Example:</b><pre>
* &nbsp;// Get a logger which will write errors to the Apache error log
* &nbsp;logger = Y.comms.log4js.getLogger('errorLogger', 1, 'ajax', { url: 'logger.php' });
* &nbsp;Y.use("comms-log4js-appenders-console", function()
* &nbsp;    {
* &nbsp;        var appender = logger.useAppender("console");
* &nbsp;        
* &nbsp;        // show() is a 'custom' method defined by the console appender.
* &nbsp;        appender.show();
* &nbsp;    });
* &nbsp;
* &nbsp;// Write a message to the log.  The above use() call is asynchronous, and it won't
* &nbsp;// have completed when log() is called here.  This message will still show up in the
* &nbsp;// console, though, because the console appender implements refresh().
* &nbsp;logger.log("My first log message");
* </pre>
* @module comms-log4js
* @namespace Y.comms.log4js
*/
YUI.add('comms-log4js', function(Y)
{
    var comms   = Y.namespace("comms"),
        loggers = { },
        registeredAppenders = { ajax: getAjaxAppender };

    /**
    * The interface to log4js - use this to create loggers and to register custom
    * appenders.
    * @class log4js
    */
    comms.log4js =
    {
        /**
        * Get a logger, optionally adding and initializing an appender for it
        * @public
        * @method getLogger
        * @param {String} name     The name of the logger to get
        * @param {Number} size     The number of log entries the logger should save.  This
        *                          parameter is only used if the logger doesn't yet exist.
        * @param {String} appender The type of appender to create on the logger.  This can
        *                          be a registered appender type or a non-registered type.
        *                          If it's not a registered type, 'init' should be the
        *                          appender.
        * @param {Variant} init    This is passed to the appender when it's created (unless
        *                          the appender type isn't registered, in which case this
        *                          is the appender to use.)
        * @return {Object}         The logger object.
        */
        getLogger: function(name, size, appender, init)
        {
            name = name || "[default]";
            size = size || 1000;

            var l = loggers[name];

            // If we don't have a logger with the given name then create a new one
            if (!l)
                l = loggers[name] = getLogger(name, size);

            // If an appender type was passed in, attach an appender of that type
            // to the logger.
            appender && l.useAppender(appender, init);

            return l;
        },

        /**
        * Register a new appender type
        * @public
        * @method register
        * @param {String} type               The name of the type of appender
        * @param {Function} appenderFactory  A function to create an appender of the given type
        */
        register: function(type, appenderFactory)
        {
            registeredAppenders[type] = appenderFactory;
        }
    };

    /**
     * Create a new logger object
     * @private
     * @method _getLogger
     * @param {String} name     The name of the logger. Passed to the appender's
     *                          constructor, but not used otherwise
     * @param {Number} size     The number of log entries to store in the logger
     * @return {Object}         The logger object
     */
    function getLogger(name, size)
    {
        var entries   = [ ],
            id        = 0,
            idx       = 0,
            appenders = { };

        return  {
                    /**
                    * A logger.  This is where you write log messages.  You can also add additional
                    * appenders to the logger, and get the cached log entries.
                    * @class logger
                    */
                    /**
                     * @public
                     * @method useAppender
                     * @param {String} type     The type of appender to use/create. Normally, 
                     *                          only one appender of any type will be attached,
                     *                          but you can work around this by passing in an
                     *                          appender (rather than an appender type) to
                     *                          log4js.getLogger()
                     * @param {Object} arg1     Initialization arguments, passed to the appender
                     *                          constructor (if an appender gets created.) The
                     *                          structure of this object is defined by the 
                     *                          appender.
                     * @return {Object}         The appender object
                     */
                    useAppender: function(type, arg1)
                    {
                        var entries, entry,
                            a = appenders[type];

                        if (!a)
                        {
                            if (a = registeredAppenders[type])
                                arg1 = a(this, arg1, name);

                            a = appenders[type] = arg1;

                            a.refresh && a.refresh();
                        }

                        return a;
                    },

                    /**
                     * @public
                     * @method log
                     * @param {String} msg      The message to log.  Strictly speaking, this
                     *                          does not have to be a string, it just has to
                     *                          be something all appenders attached to the logger
                     *                          can handle.
                     */
                    log: function(msg)
                    {
                        var a,
                            i = 0,
                            e = entries[idx++] = { msg: msg, id: ++id };

                        if (!this.noDate)
                            e.ts = new Date;

                        if (idx >= size)
                            idx = 0;

                        for (a in appenders)
                            appenders[a].notify(e);
                    },

                    /**
                     * @public
                     * @method getEntries
                     * @return {Array}        An array of all stored entries for the logger.
                     *                        The array will contain objects which will contain
                     *                        (at a minimum) 'msg' and 'id' members.
                     */
                    getEntries: function()
                    {
                        // 'normalize' the entries - put the oldest entry
                        // at index 0.
                        entries = entries.concat(entries.splice(0, idx));
                        idx = entries.length;
                        if (idx >= size)
                            idx = 0;
                        
                        return entries;
                    }
                };
    }


    /**
     * Create a new ajax appender (an appender that writes log entries to XHR)
     * @private
     * @method getAjaxAppender
     * @param {Object} logger   The logger this appender is being attached to
     * @param {Object} config   Configuration parameters for the appender.
     * @return {Object}         The appender object
     */
    function getAjaxAppender(logger, config)
    {
        config = config || { };

        var url        = config.url || "logger",
            include    = config.include,
            exclude    = config.exclude,
// These variables work with the commented out code below to allow batching of messages.
//          timerId,
//          fifo       = [ ],
//          threshold  = config.threshold || 1,
//          timeout    = config.timeout || 180000,
            maxCount   = config.maxCount || 5;

        include = include && include.split(',') || [ ];
        exclude = exclude && exclude.split(',') || [ ];

        /**
        * This class implements an appender that will use XHR to send log messages to
        * a URL.
        * @class ajaxAppender
        */
        return  {
                    /**
                     * Used by the logger to notify this appender of a new log entry.
                     * @public
                     * @method notify
                     * @param {Object} entry    A new log entry
                     */
                    notify: function(entry)
                    {
                        var item, includeIt, excludeIt,
                            l   = include.length,
                            msg = entry.msg,
                            i   = 0;

                        includeIt = checkList(include);
                        excludeIt = checkList(exclude);

                        if (maxCount && (includeIt || (!l && !excludeIt)))
                            send(entry);

                        /**
                         * Check a log message against an inclusion or exclusion list
                         * @private
                         * @method checkList
                         * @return {Boolean}    Whether or not the message matches any item on the list
                         */
                        function checkList(list)
                        {
                            for (; i < list.length; i++)
                            {
                                item = list[i];
                                if (item == '*' || (msg.indexOf(item) != -1))
                                    return 1;
                            }
                        }
                    }
                };

        /**
         * Post a log entry to the URL provided
         * @private
         * @method send
         * @param {Object} entry    The log entry to send
         */
        function send(entry)
        {
            var msg = entry.msg,
                xhr = new XMLHttpRequest();
            
            if (!--maxCount)
                msg = '[MAX_ERROR_LOG_COUNT_REACHED] ' + msg;

            xhr.open("POST", url);
            xhr.send(msg);
        }

        // This code will save messages until a certain number are received, or until
        // a timeout expires.  It's generally unnecessary, so I have commented it out.

        //function send(entry)
        //{
        //  var msg = entry.msg;
        //
        //  if (!--maxCount)
        //      msg = '[MAX_ERROR_LOG_COUNT_REACHED] ' + msg;

        //  fifo.push(msg);
        //  if (fifo.length >= threshold)
        //  {
        //      if (timerId)
        //          clearTimeout(timerId);

        //      sendNow();
        //  }
        //  else if (!timerId)
        //      timerId = setTimeout(sendNow, timeout);
        //}

        //function sendNow()
        //{
        //  var xhr = new XMLHttpRequest();
        //  xhr.open("POST", url);
        //  xhr.send(fifo.join("\n"));

        //  timerId = 0;
        //  fifo = [];
        //}
    }

}, '1.0');
