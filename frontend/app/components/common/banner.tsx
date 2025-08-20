import React from "react";
import { Button } from "./button";

function Banner() {
  return (
    <div>
      <div className="bg-cover w-full h-[30vh] lg:h-[50vh] border rounded-lg">
        <div className="relative top-1/3 left-1/16">
          <h1 className="text-3xl font-semibold">Lorem Ipsum</h1>
          <span>Lorem Ipsum</span>

          <div id="button-group" className="mt-12 w-fit flex gap-3">
            <Button type="button" className="h-12 w-24">
              Button
            </Button>
            <Button type="button" className="h-12 w-24">
              Button
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Banner;
