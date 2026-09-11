import { world, system, ItemStack } from '@minecraft/server'

system.beforeEvents.startup.subscribe(e => {
    e.blockComponentRegistry.registerCustomComponent('dorios:block_tick', {
        onTick({ block, dimension }) {
            const blockName = block.typeId.split('_')
            let players = dimension.getPlayers({ maxDistance: 4, location: block.location })

            for (let player of players) {
                const tags = player.getTags()
                if (tags.includes('dorios:lava_waders')) return
            }

            if (block.typeId == 'dorios:lava_solid_0' || block.typeId == 'dorios:lava_solid_1' || block.typeId == 'dorios:lava_flow_0' || block.typeId == 'dorios:lava_flow_1') {
                const next = blockName[0] + '_' + blockName[1] + '_' + `${parseInt(blockName[2]) + 1}`
                block.setType(`${next}`)
                return
            }
            if (block.typeId == 'dorios:lava_solid_2') {
                block.setType('lava')
            }

            if (block.typeId == 'dorios:lava_flow_2') {
                block.setType('air')
            }
        }
    })
})

