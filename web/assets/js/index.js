$(function () {
    var addpair = $('#addpair'),
        watchTemplate = $('#watch-template');

    // add watch
    $('#addpair-form').submit(function (e) {
        e.preventDefault();
        if (addpair.val()) {
            var pair = addpair.val(),
                pairLabel = pair.split('_'),
                watchHTML = watchTemplate.html();

            addpair.find('option:selected').prop('disabled', true);

            watchHTML = watchHTML.replace('<!-- PAIR -->', pairLabel[1] + '/' + pairLabel[0]);

            var watch = $(watchHTML);
            watch.data('pair', pair).attr('data-pair', pair);
            watch.hide();
            watch.appendTo('#watches');
            watch.fadeIn();

            // get initial data
            $.get(
                'https://poloniex.com/public',
                {command: 'returnTicker'},
                function(data) {
                    watch.find('.watch-ticker').html(data[pair].last);
                    watch.find('.watch-lowask').html(data[pair].lowestAsk);
                    watch.find('.watch-highbid').html(data[pair].highestBid);
                }
            );
        }
    });

    // remove watch
    $(document).on('click', '.watch-close', function (e) {
        e.preventDefault();
        var watch = $(this).parents('.watch'),
            pair = watch.data('pair');

        addpair.find('option[value="' + pair + '"]').prop('disabled', false);

        watch.fadeOut(function () {
            $(this).remove();
        });
    });

    // update values
    setInterval(function () {
        var time = Math.round(new Date().getTime() / 1000);
        $('.watch').each(function (i, item) {
            var watch = $(item),
                pair = watch.data('pair');

            $.get(
                'https://poloniex.com/public',
                {command: 'returnTradeHistory', currencyPair: pair, start: time - 300, end: time},
                function(data) {
                    var buy = 0,
                        sell = 0;

                    $.each(data, function (i, trade) {
                        if (trade.type == 'buy') {
                            buy = buy + parseFloat(trade.amount);
                        } else if (trade.type == 'sell') {
                            sell = sell + parseFloat(trade.amount);
                        }
                    });

                    // set indicator
                    var ratioHeight = 1;
                    if (buy > sell) {
                        ratioHeight = (sell / buy).toFixed(2);
                        watch.find('.indicator').find('.down').css('height', '0');
                        watch.find('.indicator').find('.up').css('height', Math.floor((1 - ratioHeight) * 50) + '%');
                    } else {
                        ratioHeight = (buy / sell).toFixed(2);
                        watch.find('.indicator').find('.up').css('height', '0');
                        watch.find('.indicator').find('.down').css('height', Math.floor((1 - ratioHeight) * 50) + '%');
                    }

                    var ratio = '1 : 1';
                    if (buy > sell) {
                        ratio = (buy / Math.max(sell, 0.00000001)).toFixed(2) + ' : 1';
                    } else if (sell > buy) {
                        ratio = '1 : ' + (sell / Math.max(buy, 0.00000001)).toFixed(2);
                    }

                    watch.find('.watch-buysell-5').html(ratio);
                }
            );

            $.get(
                'https://poloniex.com/public',
                {command: 'returnTradeHistory', currencyPair: pair, start: time - 900, end: time},
                function(data) {
                    var buy = 0,
                        sell = 0;

                    $.each(data, function (i, trade) {
                        if (trade.type == 'buy') {
                            buy = buy + parseFloat(trade.amount);
                        } else if (trade.type == 'sell') {
                            sell = sell + parseFloat(trade.amount);
                        }
                    });

                    var ratio = '1 : 1';
                    if (buy > sell) {
                        ratio = (buy / Math.max(sell, 0.00000001)).toFixed(2) + ' : 1';
                    } else if (sell > buy) {
                        ratio = '1 : ' + (sell / Math.max(buy, 0.00000001)).toFixed(2);
                    }

                    watch.find('.watch-buysell-15').html(ratio);
                }
            );
        });
    }, 5000);

    // web socket
    var wsuri = "wss://api.poloniex.com";
    var connection = new autobahn.Connection({
        url: wsuri,
        realm: "realm1"
    });

    connection.onopen = function (session) {
        console.log("Websocket connection opened!");

        function tickerEvent (ticker) {
            var watch = $('.watch[data-pair="' + ticker[0] + '"]');
            watch.find('.watch-ticker').html(ticker[1]);
            watch.find('.watch-lowask').html(ticker[2]);
            watch.find('.watch-highbid').html(ticker[3]);
        }

        session.subscribe('ticker', tickerEvent);
    };

    connection.onclose = function () {
        console.log("Websocket connection closed!");
    };

    connection.open();
});