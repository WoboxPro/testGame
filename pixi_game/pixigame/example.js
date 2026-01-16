/**
 * 🧪 Example: Using PixiGame with ECS
 * 
 * Demonstrates creating worlds, entities, and using components
 */

import { PixiGame } from './src/PixiGame.js';
import { 
  createPositionComponent,
  createVelocityComponent,
  createHealthComponent,
  createVisualComponent,
  createCollisionComponent,
  createPlayerComponent,
  createAIComponent
} from './src/components/Components.js';

console.log('=== PixiGame ECS Example ===\n');

// Create game
const game = new PixiGame();

console.log('1️⃣ Create bounded world');
const boundedWorld = game.createWorld({
  type: 'bounded',      // 'bounded' | 'infinite' | 'circular'
  width: 2000,
  height: 1500,
  backgroundColor: '#000000',
  borders: {
    enabled: true,
    width: 2,
    color: 0x00FFFF,
    style: 'solid'
  }
});

console.log('   World info:', boundedWorld.getInfo());

console.log('\n2️⃣ Create infinite world');
const infiniteWorld = game.createWorld({
  type: 'infinite'
});

console.log('   World info:', infiniteWorld.getInfo());

console.log('\n3️⃣ Create circular world');
const circularWorld = game.createWorld({
  type: 'circular',
  width: 2000,
  height: 1500,
  backgroundColor: '#001100'
});

console.log('   World info:', circularWorld.getInfo());

console.log('\n4️⃣ Create player entity (ECS style)');
const playerId = boundedWorld.createEntity({
  position: createPositionComponent(0, 0),
  velocity: createVelocityComponent(0, 0),
  health: createHealthComponent(100, 100),
  visual: createVisualComponent({
    type: 'triangle',
    color: 0x00ff00,
    size: 15
  }),
  collision: createCollisionComponent({
    enabled: true,
    form: 'circle',
    radius: 15
  }),
  player: createPlayerComponent('local')
});

console.log(`   Player created: ${playerId}`);

console.log('\n5️⃣ Create enemy entity (ECS style)');
const enemy1Id = boundedWorld.createEntity({
  position: createPositionComponent(200, 0),
  velocity: createVelocityComponent(0, 0),
  health: createHealthComponent(50, 50),
  visual: createVisualComponent({
    type: 'square',
    color: 0xff0000,
    size: 12
  }),
  collision: createCollisionComponent({
    enabled: true,
    form: 'circle',
    radius: 12
  }),
  ai: createAIComponent({
    enabled: true,
    behavior: 'chase',
    speed: 2,
    patrolRadius: 100
  })
});

console.log(`   Enemy created: ${enemy1Id}`);

console.log('\n6️⃣ Create building/entity (ECS style)');
const buildingId = boundedWorld.createEntity({
  position: createPositionComponent(100, 100),
  health: createHealthComponent(200, 200),
  visual: createVisualComponent({
    type: 'rect',
    color: 0x888888,
    width: 40,
    height: 40
  }),
  collision: createCollisionComponent({
    enabled: true,
    form: 'rect',
    width: 40,
    height: 40
  })
});

console.log(`   Building created: ${buildingId}`);

console.log('\n7️⃣ Get entity components');
console.log(`   Player position:`, boundedWorld.getComponent(playerId, 'position'));
console.log(`   Player health:`, boundedWorld.getComponent(playerId, 'health'));
console.log(`   Player AI:`, boundedWorld.getComponent(playerId, 'ai'));
console.log(`   Enemy 1 AI:`, boundedWorld.getComponent(enemy1Id, 'ai'));

console.log('\n8️⃣ Test bounds (bounded world)');
const boundedTest = boundedWorld.clampToBounds(3000, 3000);
console.log(`   Clamp (3000, 3000):`, boundedTest);
const insideTest = boundedWorld.clampToBounds(100, 100);
console.log(`   Clamp (100, 100):`, insideTest);
const insideCheck = boundedWorld.isInsideWorld(100, 100);
console.log(`   Is inside (100, 100):`, insideCheck);

console.log('\n9️⃣ Test wrap (circular world)');
const wrapped = circularWorld.wrapCoordinates(1200, 1000);
console.log(`   Wrap (1200, 1000):`, wrapped);

console.log('\n🔟 Add component to existing entity');
boundedWorld.addComponent(playerId, 'testComponent', { value: 'test' });
console.log(`   Test component:`, boundedWorld.getComponent(playerId, 'testComponent'));

console.log('\n🗑️ Remove entity');
boundedWorld.removeEntity(playerId);
console.log(`   Player removed`);
console.log(`   Entity count:`, boundedWorld.entities.size);

console.log('\n📊 All worlds info:');
console.log(game.getWorldsInfo());

console.log('\n=== Example Complete ===');
