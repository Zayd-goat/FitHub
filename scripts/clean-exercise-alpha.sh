#!/usr/bin/env bash
set -euo pipefail

project_root="$(cd "$(dirname "$0")/.." && pwd)"
scratch_dir="$(mktemp -d)"
trap 'rm -rf "$scratch_dir"' EXIT

checked=0
changed=0
removed=0

for gender in male female; do
  while IFS= read -r file; do
    checked=$((checked + 1))
    alpha_mask="$scratch_dir/alpha.png"
    clean_mask="$scratch_dir/clean.png"
    combined_mask="$scratch_dir/combined.png"
    output_file="$scratch_dir/output.png"

    component_output="$(convert "$file" -alpha extract -threshold 1% -define connected-components:verbose=true -connected-components 8 null: 2>&1)"
    largest_id="$(printf '%s\n' "$component_output" | perl -ne 'if (/^\s*(\d+):\s+(\d+)x(\d+)\+(\d+)\+(\d+)\s+\S+\s+(\d+)\s+gray\(255\)/) { if ($6 > $max) { $max=$6; $id=$1 } } END { print defined($id) ? $id : "" }')"
    remove_ids="$(printf '%s\n' "$component_output" | LARGEST_ID="$largest_id" perl -ne '
      if (/^\s*(\d+):\s+(\d+)x(\d+)\+(\d+)\+(\d+)\s+\S+\s+(\d+)\s+gray\(255\)/) {
        ($id,$w,$h,$x,$y,$area)=($1,$2,$3,$4,$5,$6);
        $largest=$ENV{"LARGEST_ID"};
        if ($id ne $largest && ($area < 300 || $x == 0 || $y == 0 || $x + $w >= 768 || $y + $h >= 512)) { push @ids,$id; }
      }
      END { print join(",",@ids); }
    ')"

    if [[ -z "$remove_ids" ]]; then
      continue
    fi

    convert "$file" -alpha extract -threshold 1% \
      -define connected-components:remove="$remove_ids" \
      -define connected-components:mean-color=true \
      -connected-components 8 "$clean_mask"
    convert "$file" -alpha extract "$clean_mask" -compose multiply -composite "$combined_mask"
    convert "$file" "$combined_mask" -alpha off -compose CopyOpacity -composite -define png:color-type=6 "$output_file"

    dimensions="$(identify -format '%wx%h' "$output_file")"
    if [[ "$dimensions" != "768x512" ]]; then
      echo "Refusing invalid output for $file ($dimensions)" >&2
      exit 1
    fi
    mv "$output_file" "$file"
    changed=$((changed + 1))
    component_count="$(awk -F, '{print NF}' <<< "$remove_ids")"
    removed=$((removed + component_count))
  done < <(find "$project_root/assets/train_v3/$gender" -maxdepth 1 -type f -name '*.png' -print | sort)
done

printf 'FitHub alpha cleanup complete: %d images checked, %d images changed, %d detached artifacts removed.\n' "$checked" "$changed" "$removed"
