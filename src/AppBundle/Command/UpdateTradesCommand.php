<?php
/**
 * Created by PhpStorm.
 * User: mkt
 * Date: 23.05.17
 * Time: 02:03
 */

namespace AppBundle\Command;


use Symfony\Bundle\FrameworkBundle\Command\ContainerAwareCommand;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Stopwatch\Stopwatch;

class UpdateTradesCommand extends ContainerAwareCommand
{
    public function configure()
    {
        $this->setName('app:update');
    }

    public function execute(InputInterface $input, OutputInterface $output)
    {
        $stopwatch = new Stopwatch();
        $stopwatch->start('update');

        $poloniex = $this->getContainer()->get('poloniex');

        $pairs = $poloniex->get_trading_pairs();

        foreach ($pairs as $pair) {
            $history = $poloniex->get_trade_history($pair);
            $ticker = $poloniex->get_ticker();
        }

        dump($stopwatch->stop('update')->getDuration());
    }
}