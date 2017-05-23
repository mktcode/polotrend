<?php

namespace AppBundle\Controller;

use Sensio\Bundle\FrameworkExtraBundle\Configuration\Route;
use Symfony\Bundle\FrameworkBundle\Controller\Controller;
use Symfony\Component\HttpFoundation\Request;

class DefaultController extends Controller
{
    /**
     * @Route("/", name="homepage")
     */
    public function indexAction()
    {
        $pairs = $this->get('poloniex')->get_trading_pairs();
        sort($pairs);

        return $this->render('default/index.html.twig', [
            'pairs' => $pairs
        ]);
    }
}
