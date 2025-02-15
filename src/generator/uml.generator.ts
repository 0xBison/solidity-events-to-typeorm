import { EOL } from 'os';
import { join } from 'path';
import { Direction, Flags, Format, TypeormUml } from 'typeorm-uml';
import { TypeOrmGenerator } from './generator.interface';

// Run the docker-compose to bring up plantuml and postgres which is required for this script to run
export class TypeOrmUmlGenerator implements TypeOrmGenerator {
  public generate(config: Config): void {
    // TODO: namingStrategy: new SnakeNamingStrategy(),
    const configPath = join(__dirname, './ormconfig.json');

    const flags: Flags = {
      direction: Direction.LR,
      format: Format.PNG,
      handwritten: false,
      'plantuml-url': 'localhost:8080',
    };

    const typeormUml = new TypeormUml();
    typeormUml.build(configPath, flags).then((url) => {
      process.stdout.write('Diagram URL: ' + url + EOL);
    });
  }
}
