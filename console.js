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
* An appender that displays log messages in a pop-up window.
* @module comms-log4js-appenders-console
*/
YUI.add('comms-log4js-appenders-console', function(Y)
{
    Y.comms.log4js.register("console",
        function(logger, show, name)
        {
            var w, doc, output, filterTimeout, timestamps, filter,
                regex = /.*/,
                firstIdx = 0,
                /**
                * This class implements an appender that will display log messages in a 
                * pop-up window.  The appender can be created and attached without opening
                * the window, if desired.  The window can later be opened by calling show().
                * @class consoleAppender
                */
                a = 
                {
                    /**
                     * Used by the logger to notify this appender of a new log entry.
                     * @public
                     * @method notify
                     * @param {Object} entry    A new log entry
                     */
                    notify: function(entry)
                    {
                        if (output)
                            output.value += format(entry, timestamps.checked);
                    },
                    /**
                     * Open the pop-up window
                     * @public
                     * @method show
                     */
                    show: function()
                    {
                        w = window.open('', name, 'width=650,height=700,resizable');
                        doc = w.document;

                        doc.body.innerHTML =
                            '<div id="toolbar" style="border-bottom:1px solid #aca899;background-color:#f1efe7;height:22px;font-size:90%">' +
                            '<button id="clear" style="float:right;margin-right:3px;font-size:95%;font-family:inherit">Clear</button>' +
                            '<input id="filter" type="text" title="Type to Filter" style="font-size:95%;float:right;margin-right:20px;font-family:tahoma,verdana"></input>' +
                            '<input id="timestamps" type="checkbox" style="font-size:95%"></input><label for="timestamps">Timestamps</label>' + 
                            '</div>' +
                            '<div style="position:fixed;width:100%;top:22px;bottom:0;margin:0">'+
                            '<textarea id="output" readonly="readonly" style="resize:none;padding:0;width:100%;height:100%"></textarea>'+
                            '</div>';

                        doc.body.style.cssText="padding:0;margin:0;font-size:77%;font-family:tahoma,verdana";

                        output = doc.getElementById("output");
                    
                        doc.getElementById("clear").onclick = clear;

                        timestamps = doc.getElementById("timestamps");
                        timestamps.onclick = refresh;
                        filter = doc.getElementById("filter");
                        filter.value = '.*';
                    
                        filter.onkeyup = changeFilter;

                        refresh();
                    },
                    /**
                     * Redraw all log entries in the window.
                     * @public
                     * @method refresh
                     */
                    refresh: function()
                    {
                        if (output)
                        {
                            var entry,
                                out     = [ ],
                                i       = 0,
                                entries = logger.getEntries(),
                                checked = timestamps.checked;

                            if (logger.header && regex.test(logger.header))
                                out.push(logger.header);

                            while (entry = entries[i++])
                            {
                                if (entry.id > firstIdx && regex.test(entry.msg))
                                    out.push(format(entry, checked));
                            }
            
                            output.value = out.join("");
                        }
                    }
                },
                refresh = a.refresh;

            logger.show = a.show;
            show && a.show();

            return a;
        
            /**
            * Clear the window. All this does is change the first index to display to be
            * the next log entry to be received. It's not implemented, but un-clearing is
            * possible.
            * @private
            * @method clear
            */
            function clear()
            {
                var entries = logger.getEntries();
                firstIdx = entries.length && entries[entries.length-1].id;
                refresh();
            }
        
            /**
            * The filter has been changed.  Wait a short time and then redraw the window.
            * The wait is to avoid redrawing on every keystroke when the user is typing
            * a new filter.
            * @private
            * @method changeFilter
            */
            function changeFilter()
            {
                if (filterTimeout)
                    clearTimeout(filterTimeout);
                filterTimeout = setTimeout(updateFilter, 200);
            }

            /**
            * The filter has changed and the short wait in changeFilter() has expired.
            * Redraw the window using the new filter.
            * @private
            * @method updateFilter
            */
            function updateFilter()
            {
                filterTimeout = 0;
            
                // Do this in a try/catch because the user may type in an invalid regex
                try
                {
                    regex = new RegExp(filter.value, 'i');
                }
                catch (e) { }

                refresh();
            }
        
            /**
            * Format a single log entry for display.
            * @private
            * @method format
            * @param entry {Object} The log entry to format
            * @param ts {Boolean}   Whether or not to include the timestamp (if present)
            * @return {String} The log message, ready for display.
            */
            function format(entry, ts)
            {
                var msg = "";
            
                if (entry.id > firstIdx && regex.test(entry.msg))
                {
                    ts = ts && entry.ts;
            
                    if (ts)
                    {
                        msg = ts.toTimeString().split(" ")[0];
                        ts = "" + ts.getMilliseconds();
                        while (ts.length < 3)
                            ts = "0" + ts;
                    
                        msg = "[" + msg + "." + ts + "] ";
                    }

                    msg = entry.id + ". " + msg + entry.msg + "\n";
                }

                return msg;
            }
        });

}, '1.0.0', { requires: [ 'comms-log4js' ] });
