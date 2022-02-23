import {MapReduceMapper} from "@shared/MapReduceMapper";
import {MapReduceGrouper} from "@shared/MapReduceGrouper";
import {MapReduceReducer} from "@shared/MapReduceReducer";
import {sleep} from "@shared/functions";
import Logger from "jet-logger";

export class MapReduceMaster {

    mappers: MapReduceMapper[] = [];
    groupers: MapReduceGrouper[] = [];
    reducers: MapReduceReducer[] = [];
    running = true;
    private numMappersFinished = 0;

    // eslint-disable-next-line @typescript-eslint/require-await
    async getWordCounts(urls_array: string[],
                        words_to_find: string[]): Promise<Map<string, number>> {

        console.log(words_to_find);

        words_to_find = words_to_find.sort();

        this.mappers = [];
        this.reducers = [];
        this.groupers = [];

        for (let i = 0; i < 5; i++) {
            const newReducer = new MapReduceReducer();
            this.reducers.push(newReducer);
        }

        for (let i = 0; i < 5; i++) {
            const newGrouper = new MapReduceGrouper(this.reducers);
            this.groupers.push(newGrouper);
        }

        for (let i = 0; i < urls_array.length; i++) {
            const url = urls_array[i];
            const newMapper = new MapReduceMapper(`${i}`, this.groupers);
            this.mappers.push(newMapper);

            setTimeout(() => {
                newMapper.getWordCounts(url, words_to_find, this);
            }, 0);

        }

        while (this.running) {
            await sleep(0);
        }

        let wait_groupers = true;
        while (wait_groupers) {
            wait_groupers = false;
            for (const grouper of this.groupers) {
                if (grouper.isBusy()) {
                    wait_groupers = true;
                }
            }
        }

        let wait_reducers = true;
        while (wait_reducers) {
            wait_reducers = false;
            for (const reducer of this.reducers) {
                if (reducer.isBusy()) {
                    wait_reducers = true;
                }
            }
        }

        const toReturn = new Map<string, number>();

        console.log("Wrapping up:")

        for (const reducer of this.reducers) {
            console.log(reducer.words);
            for (const key of Array.from(reducer.words.keys())) {
                toReturn.set(key, (toReturn.get(key) || 0) + (reducer.words.get(key) || 0));
            }
        }

        return toReturn;
    }

    private checkForStop() {
        if (this.numMappersFinished == this.mappers.length) {
            this.running = false;
        }
    }

    reportMapperFinished(id: string) {
        Logger.Info(`Mapper ${id} reported done.`);
        this.numMappersFinished += 1;
        this.checkForStop();
    }
}
