import { system, BlockPermutation } from '@minecraft/server';

system.beforeEvents.startup.subscribe(e => {
    e.blockComponentRegistry.registerCustomComponent('dorios:block_tick', {
        onTick({ block, dimension }) {
            const match = /^dorios:lava_(solid|flow)_([0-2])$/.exec(block.typeId);
            if (!match) return;
            // Keep the current block stable while any wearer maintains this circle.
            const { x, y, z } = block.location;
            const supported = dimension.getPlayers({ location: block.location, maxDistance: 4 }).some(player => {
                if (!player.isValid || !player.hasTag('dorios:lava_waders')) return false;
                const feetY = Math.floor(player.location.y);
                const dx = x - Math.floor(player.location.x);
                const dz = z - Math.floor(player.location.z);
                return (y === feetY || y === feetY - 1) && dx * dx + dz * dz <= 4;
            });
            if (supported) return;
            const depth = block.permutation.getState('dorios:liquid_depth') ?? (match[1] === 'solid' ? 0 : 1);
            const stage = Number(match[2]);
            const typeId = stage < 2 ? `dorios:lava_${match[1]}_${stage + 1}` : 'minecraft:lava';
            const state = stage < 2 ? 'dorios:liquid_depth' : 'liquid_depth';
            block.setPermutation(BlockPermutation.resolve(typeId, { [state]: depth }));
        },
    });
});
