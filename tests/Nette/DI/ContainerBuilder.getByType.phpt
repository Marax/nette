<?php

/**
 * Test: Nette\DI\ContainerBuilder and Container: getByType()
 *
 * @author     David Grudl
 * @package    Nette\DI
 */

use Nette\DI;



require __DIR__ . '/../bootstrap.php';



class Service extends Nette\Object
{
}



$builder = new DI\ContainerBuilder;
$builder->addDefinition('one')
	->setClass('Service');
$builder->addDefinition('two')
	->setClass('Nette\Object');


// compile-time
$builder->prepareClassList();

Assert::same( 'one', $builder->getByType('service') );
Assert::same( NULL, $builder->getByType('unknown') );
Assert::throws(function() use ($builder) {
	$builder->getByType('Nette\Object');
}, 'Nette\DI\ServiceCreationException', 'Multiple services of type Nette\Object found: one, two');


// run-time
$code = (string) $builder->generateClass();
file_put_contents(TEMP_DIR . '/code.php', "<?php\n$code");
require TEMP_DIR . '/code.php';

$container = new Container;

Assert::true( $container->getByType('service') instanceof Service );
Assert::same( NULL, $container->getByType('unknown', FALSE) );

Assert::throws(function() use ($container) {
	$container->getByType('unknown');
}, 'Nette\DI\MissingServiceException', 'Service of type unknown not found.');

Assert::throws(function() use ($container) {
	$container->getByType('Nette\Object');
}, 'Nette\DI\MissingServiceException', 'Multiple services of type Nette\Object found.');
