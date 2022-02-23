export class MapReduceReducer {

    words: Map<string, number> = new Map<string, number>();
    busy = false;

    offer(word: string) {
        // console.log(`Reducer offered ${word}`);
        this.busy = true;
        this.words.set(word, (this.words.get(word) || 0) + 1);
        this.busy = false;
        // console.log("Reducer words: ", this.words);
    }

    isBusy() {
        return this.busy;
    }
}