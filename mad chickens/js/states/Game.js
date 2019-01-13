var Achicken = Achicken || {};

Achicken.GameState = {

  init: function(currentLevel) {    
    //constants
    this.MAX_DISTANCE_SHOOT = 190;
    this.MAX_SPEED_SHOOT = 1200;
    this.SHOOT_FACTOR = 12;
    this.KILL_DIFF = 25;


    //keep track of the current level
    this.currentLevel = currentLevel ? currentLevel : 'level1';

    //gravity
    this.game.physics.p2.gravity.y = 1000;
      
    //collision group
    this.blocksCollisionGroup = this.game.physics.p2.createCollisionGroup();
    this.enemiesCollisionGroup = this.game.physics.p2.createCollisionGroup();
    this.chickensCollisionGroup = this.game.physics.p2.createCollisionGroup();

  },
  create: function() {      

    //sky background
    this.sky = this.add.tileSprite(0, 0, this.game.world.width, this.game.world.height, 'sky');
    this.game.world.sendToBack(this.sky);
      
    //chicken display
    this.chickenHUD = this.add.group();

    //enemies
    this.enemies = this.add.group();
    this.enemies.enableBody = true;
    this.enemies.physicsBodyType = Phaser.Physics.P2JS;
      
    //blocks
    this.blocks = this.add.group();
    this.blocks.enableBody = true;
    this.blocks.physicsBodyType = Phaser.Physics.P2JS;
      
    //bodies in p2 -> they ger their anchor points set to 0.5
    this.floor = this.add.tileSprite(this.game.world.width/2, this.game.world.height - 24, this.game.world.width, 48, 'floor');
    this.blocks.add(this.floor);
      
    this.floor.body.setCollisionGroup(this.blocksCollisionGroup);
    this.floor.body.collides([this.blocksCollisionGroup, this.enemiesCollisionGroup, this.chickensCollisionGroup]);
    //body.static = inmovable in arcade
    this.floor.body.static = true;
    
    this.loadLevel();
     
    //init chicken shooting
    this.pole = this.add.sprite(180, 500, 'pole');
    this.pole.anchor.setTo(0.5, 0);
      
    this.game.input.onDown.add(this.prepareShot, this);
      
    //prepare our first chicken
    this.setupChicken();
      
  },   
  update: function() {  
    if(this.isPreparingShot){
        //make the chicken follow the user input pointer
        this.chicken.x = this.game.input.activePointer.x;
        this.chicken.y = this.game.input.activePointer.y;
        
        var distance = Phaser.Point.distance(this.chicken.position, this.pole.position);
        
        if(distance > this.MAX_DISTANCE_SHOOT){
            this.isPreparingShot = false;
            this.isChickenReady = true;
            
            this.chicken.x = this.pole.x;
            this.chicken.y = this.pole.y;
        }
        
        //shoot when relesing
        if(this.game.input.activePointer.isUp){
            console.log('now shoot!!!');
            this.isPreparingShot = false;
            
            this.throwChicken();
        }
    }
  },
    
    
  gameOver: function() {
    this.game.state.start('Game', true, false, this.currentLevel);
  },
    
  loadLevel: function(){
      this.levelData = JSON.parse(this.game.cache.getText(this.currentLevel));
      
      //create all te blocks
      this.levelData.blocks.forEach(function(block){
          this.createBlocks(block)
      },this)
      
      //create all te enemies
      this.levelData.enemies.forEach(function(enemy){
          this.createEnemy(enemy)
      },this)
      
      //hard coded data
      this.countDeadEnemies = 0;
      this.numOfEnemies = this.levelData.enemies.length;
      this.numChicken = 3;
  },
    
    createBlocks: function(data){
        var block = new Phaser.Sprite(this.game, data.x, data.y, data.asset);
        this.blocks.add(block);
        
        //set mass
        block.body.mass = data.mass;
        
        //set the collision group
        block.body.setCollisionGroup(this.blocksCollisionGroup);
        
        //they will collide with
        block.body.collides([this.blocksCollisionGroup, this.enemiesCollisionGroup, this.chickensCollisionGroup]);
    },
    
    hitEnemy: function(bodyB, shapeA, shapeB, equation){
        var velocityDiff = Phaser.Point.distance(
        new Phaser.Point(equation[0].bodyA.velocity[0], equation[0].bodyA.velocity[1]),
        new Phaser.Point(equation[0].bodyB.velocity[0], equation[0].bodyB.velocity[1])
        );
        
        if(velocityDiff > Achicken.GameState.KILL_DIFF){
            console.log(velocityDiff);
            this.kill();
            
            //update the game state
            Achicken.GameState.updateDeadCount();
        }
    },
    
    createEnemy: function(data){
        var enemy = new Phaser.Sprite(this.game, data.x, data.y, data.asset);
        this.enemies.add(enemy);
        
        //set the collision group
        enemy.body.setCollisionGroup(this.enemiesCollisionGroup);
        
        //they will collide with
        enemy.body.collides([this.blocksCollisionGroup, this.enemiesCollisionGroup, this.chickensCollisionGroup]);
        
        enemy.body.onBeginContact.add(this.hitEnemy, enemy);
    },
    
    prepareShot: function(event){
        if(this.isChickenReady){
        this.isPreparingShot = true;
        this.isChickenReady = false;
        }
    },
    
    
    setupChicken: function(){
        //add chicken to starting position
        this.chicken = this.add.sprite(this. pole.x, this.pole.y, 'chicken');
        this.chicken.anchor.setTo(0.5);
        
        this.isChickenReady = true;
        this.refreshStats();
    },
    
    
    throwChicken: function(){
        //enable physics one thrown
        this.game.physics.p2.enable(this.chicken);
        
        //set collision group
        this.chicken.body.setCollisionGroup(this.chickensCollisionGroup);
        
        //they will collide with
        this.chicken.body.collides([this.blocksCollisionGroup, this.enemiesCollisionGroup, this.chickensCollisionGroup]);
        
        //calculate the diffrence betweem tje current position and the top of the pole;
        var diff = Phaser.Point.subtract(this.pole.position, this.chicken.position);
        
        //set chicken velocity acording to the difference vectorr
        this.chicken.body.velocity.x = Math.abs(diff.x)/diff.x * Math.min(Math.abs(diff.x * this.SHOOT_FACTOR), this.MAX_SPEED_SHOOT);
        this.chicken.body.velocity.y = Math.abs(diff.y)/diff.y * Math.min(Math.abs(diff.y * this.SHOOT_FACTOR), this.MAX_SPEED_SHOOT);
        
        //what happensafterthe bird is thrown
        this.endTurn();
    },
    
    updateDeadCount: function(){
        this.countDeadEnemies++;
        
        if(this.countDeadEnemies == this.numOfEnemies){
            console.log('you have won');
            
            this.gameOver();
        }
    },
    
    endTurn: function(){
        //decrese the number of chicken left to throw
        this.numChicken--;
        
        ///next chicken or game over some seconds later
        this.game.time.events.add(3 * Phaser.Timer.SECOND, function(){
            this.chicken.kill();
            
            //a second later we should show a new chicken
            this.game.time.events.add(Phaser.Timer.SECOND, function(){
                if(this.numChicken > 0){
                    this.setupChicken();
                }
                else{
                    console.log('You Lose Try to aim better next time');
                    this.gameOver();
                }
            },this)
        }, this)
    },
    
    refreshStats: function(){
        this.chickenHUD.removeAll();
        
        var i = 0;
        while (i < this.numChicken){
            this.chickenHUD.create(this.game.width  - 100 - i* 80, 30, 'chicken');
            
            i++;
        }
    }
    
};
