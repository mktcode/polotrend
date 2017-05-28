# PoloTrend

Little tool for short term buy/sell based trend indication on poloniex.


## Install

    git clone git@github.com:mktcode/polotrend.git
    cd polotrend
    composer install
    bower install

    # app/config/parameters.yml
    parameters:
        ...
        poloniex_api_key: YourApoKey
        poloniex_api_secret: YourApiSecret

## TODO

- solve performance issues
- save setup in localstorage (active pairs, display/notification settings)
- take orders into calculation
- notification sounds
- trollbox implementation
- better explaination