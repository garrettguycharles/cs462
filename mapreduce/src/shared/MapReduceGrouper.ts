import {MapReduceReducer} from "@shared/MapReduceReducer";

export class MapReduceGrouper {
    reducers: MapReduceReducer[];
    busy = false;

    constructor(reducers: MapReduceReducer[]) {
        this.reducers = reducers;
    }

    private hashWord(input: string): number {
        let hash = 0, i, chr;
        if (input.length === 0) return hash;
        for (i = 0; i < input.length; i++) {
            chr   = input.charCodeAt(i);
            hash  = ((hash << 5) - hash) + chr;
            hash |= 0; // Convert to 32bit integer
        }
        return Math.abs(hash);
    }

    // eslint-disable-next-line @typescript-eslint/require-await
    async offer(word: string): Promise<void> {
        this.busy = true;

        const hash = this.hashWord(word);

        const reducerIndex = hash % this.reducers.length;
        console.log(`reducerIndex: ${reducerIndex}, hash: ${hash}, 
            hash % length: ${hash % this.reducers.length}`);
        // const reducerIndex = (word.charCodeAt(0) - "A".charCodeAt(0)) % this.reducers.length;
        // console.log(`Reducer length: ${this.reducers.length} reducerIndex: ${reducerIndex}`);


        this.reducers[reducerIndex].offer(word);
        this.busy = false;
    }

    isBusy() {
        return this.busy;
    }
}