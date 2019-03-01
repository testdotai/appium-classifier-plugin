import path from 'path';
import chai from 'chai';
import should from 'should';

import { TF_VERSION, detect } from '../lib/detector';

chai.use(should);

const BIRDS_IMG = path.resolve(__dirname, "..", "..", "test", "fixtures", "birds.jpg");
const SCREEN_IMG = path.resolve(__dirname, "..", "..", "test", "fixtures", "screen.jpg");

describe('Native object detection', function () {

  it('should get the tensorflow version', function () {
    TF_VERSION.should.match(/^1\./);
  });

  it('should detect objects in an image of birds', function () {
    const res = detect(BIRDS_IMG, 0.95, true);
    res.length.should.eql(2);
    should.exist(res[0].confidence);
    res[0].ymin.should.be.above(0.5);
    res[0].ymin.should.be.below(0.6);
    res[1].ymin.should.be.above(0.1);
    res[1].ymin.should.be.below(0.2);
  });

  it('should detect objects in a mobile app screenshot', function () {
    const res = detect(SCREEN_IMG, 0.95, true);
    res.length.should.be.above(1);
  });

});
